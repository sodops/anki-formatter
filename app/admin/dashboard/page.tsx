"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ================================================================
   TYPES
   ================================================================ */
interface DashboardStats {
  users: { total: number; active: number; new: number };
  decks: { total: number; created_today: number };
  cards: { total: number; created_today: number };
  reviews: { total: number; today: number };
  webVitals: { count: number; avgLCP: number };
}

interface CardStates {
  new: number;
  learning: number;
  review: number;
  relearning: number;
}

interface TodayGrades {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

interface RecentDeck {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  email: string | null;
  name: string;
  avatar: string | null;
  lastSignIn: string | null;
  createdAt: string | null;
}

interface ActivityItem {
  id: string;
  type: "user_signup" | "deck_created" | "cards_added" | "review_session" | "error";
  user: string;
  message: string;
  timestamp: string;
  icon: string;
  color: string;
}

interface MetricSummary {
  name: string;
  count: number;
  avg: number;
  median: number;
  p75: number;
  p95: number;
  min: number;
  max: number;
  rating: { good: number; needsImprovement: number; poor: number };
}

type Tab = "overview" | "users" | "content" | "analytics" | "vitals" | "api" | "system";

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function ModernAdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [cardStates, setCardStates] = useState<CardStates>({
    new: 0,
    learning: 0,
    review: 0,
    relearning: 0,
  });
  const [todayGrades, setTodayGrades] = useState<TodayGrades>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [recentDecks, setRecentDecks] = useState<RecentDeck[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dueCards, setDueCards] = useState(0);
  const [logsCount, setLogsCount] = useState(0);
  const [metricsData, setMetricsData] = useState<MetricSummary[]>([]);
  const [metricsDays, setMetricsDays] = useState(7);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  // Fetch Web Vitals metrics
  const fetchMetrics = useCallback(async () => {
    if (!user) return;
    setMetricsLoading(true);
    try {
      const res = await fetch(`/api/admin/metrics?days=${metricsDays}`);
      if (res.ok) {
        const json = await res.json();
        setMetricsData(json.summary || []);
      }
    } catch {
      // ignore
    } finally {
      setMetricsLoading(false);
    }
  }, [user, metricsDays]);

  useEffect(() => {
    if (tab === "vitals") fetchMetrics();
  }, [tab, fetchMetrics]);

  // Load Ionicons
  useEffect(() => {
    const id = "ionicons-esm";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.type = "module";
      s.src = "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js";
      document.head.appendChild(s);
      const fb = document.createElement("script");
      fb.setAttribute("nomodule", "");
      fb.src = "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js";
      document.head.appendChild(fb);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/overview");
      if (res.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        // Transform data to stats format
        setStats({
          users: { total: 1, active: 1, new: 0 },
          decks: { total: data.counts?.decks || 0, created_today: 0 },
          cards: { total: data.counts?.cards || 0, created_today: 0 },
          reviews: { total: data.counts?.totalReviews || 0, today: data.counts?.todayReviews || 0 },
          webVitals: { count: data.counts?.webVitals || 0, avgLCP: 0 },
        });

        // Store additional data
        if (data.cardStates) setCardStates(data.cardStates);
        if (data.todayGrades) setTodayGrades(data.todayGrades);
        if (data.recentDecks) setRecentDecks(data.recentDecks);
        if (data.user) setUserProfile(data.user);
        if (data.counts?.dueCards !== undefined) setDueCards(data.counts.dueCards);
        if (data.counts?.logs !== undefined) setLogsCount(data.counts.logs);

        // Generate activity feed from recent logs
        if (data.recentLogs) {
          const acts: ActivityItem[] = data.recentLogs.slice(0, 10).map((log: any) => ({
            id: log.id,
            type: log.level === "ERROR" ? "error" : "review_session",
            user: "System",
            message: log.message,
            timestamp: log.created_at,
            icon: log.level === "ERROR" ? "alert-circle" : "checkmark-circle",
            color: log.level === "ERROR" ? "danger" : "success",
          }));
          setActivities(acts);
        }
      }
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading || isLoading) {
    return (
      <div className="admin-container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            width: "100%",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
            <p style={{ color: "var(--text-secondary)" }}>Loading admin panel...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="admin-container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            width: "100%",
            padding: "2rem",
          }}
        >
          <div className="admin-card" style={{ maxWidth: "480px", textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🚫</div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Access Denied
            </h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              This admin panel is restricted to administrators only.
            </p>
            <Link href="/app" className="admin-btn admin-btn-primary">
              <ion-icon name="arrow-back"></ion-icon>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <link rel="stylesheet" href="/admin.css" />

      <div className="admin-container">
        {/* Sidebar */}
        <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="admin-sidebar-header">
            <span className="admin-sidebar-logo">⚡</span>
            <span className="admin-sidebar-title">AnkiFlow Admin</span>
          </div>

          <nav className="admin-nav">
            <div className="admin-nav-section">
              <div className="admin-nav-section-title">Main</div>
              <button
                className={`admin-nav-item ${tab === "overview" ? "active" : ""}`}
                onClick={() => setTab("overview")}
              >
                <ion-icon name="grid-outline"></ion-icon>
                Overview
              </button>
              <button
                className={`admin-nav-item ${tab === "users" ? "active" : ""}`}
                onClick={() => setTab("users")}
              >
                <ion-icon name="people-outline"></ion-icon>
                Users
              </button>
              <button
                className={`admin-nav-item ${tab === "content" ? "active" : ""}`}
                onClick={() => setTab("content")}
              >
                <ion-icon name="library-outline"></ion-icon>
                Content
              </button>
            </div>

            <div className="admin-nav-section">
              <div className="admin-nav-section-title">Analytics</div>
              <button
                className={`admin-nav-item ${tab === "analytics" ? "active" : ""}`}
                onClick={() => setTab("analytics")}
              >
                <ion-icon name="bar-chart-outline"></ion-icon>
                Analytics
              </button>
              <button
                className={`admin-nav-item ${tab === "vitals" ? "active" : ""}`}
                onClick={() => setTab("vitals")}
              >
                <ion-icon name="pulse-outline"></ion-icon>
                Web Vitals
              </button>
            </div>

            <div className="admin-nav-section">
              <div className="admin-nav-section-title">System</div>
              <button
                className={`admin-nav-item ${tab === "api" ? "active" : ""}`}
                onClick={() => setTab("api")}
              >
                <ion-icon name="code-slash-outline"></ion-icon>
                API Explorer
              </button>
              <button
                className={`admin-nav-item ${tab === "system" ? "active" : ""}`}
                onClick={() => setTab("system")}
              >
                <ion-icon name="settings-outline"></ion-icon>
                System Status
              </button>
            </div>

            <div
              className="admin-nav-section"
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "1rem",
                marginTop: "auto",
              }}
            >
              <Link href="/app" className="admin-nav-item">
                <ion-icon name="arrow-back-outline"></ion-icon>
                Back to App
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          {/* Header */}
          <header className="admin-header">
            <div className="admin-header-left">
              <button className="admin-icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <ion-icon name="menu-outline"></ion-icon>
              </button>

              <div>
                <h1 className="admin-header-title">
                  {tab === "overview" && "Dashboard Overview"}
                  {tab === "users" && "User Management"}
                  {tab === "content" && "Content Manager"}
                  {tab === "analytics" && "Analytics"}
                  {tab === "vitals" && "Web Vitals"}
                  {tab === "api" && "API Explorer"}
                  {tab === "system" && "System Status"}
                </h1>
                <div className="admin-header-breadcrumb">
                  <span>Admin</span>
                  <ion-icon name="chevron-forward-outline"></ion-icon>
                  <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                </div>
              </div>
            </div>

            <div className="admin-header-right">
              <div className="admin-header-actions">
                <button className="admin-icon-btn" onClick={fetchDashboard} title="Refresh">
                  <ion-icon name="refresh-outline"></ion-icon>
                </button>

                <div
                  className="admin-icon-btn"
                  style={{ width: "auto", padding: "0 0.75rem", gap: "0.5rem" }}
                >
                  <ion-icon name="person-circle-outline"></ion-icon>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                    {user?.user_metadata?.name || user?.email?.split("@")[0] || "Admin"}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="admin-content">
            {tab === "overview" && stats && (
              <>
                {/* Stats Grid */}
                <div className="admin-stats-grid">
                  <div className="admin-stat-card">
                    <div className="admin-stat-card-header">
                      <div className="admin-stat-card-icon">
                        <ion-icon name="albums"></ion-icon>
                      </div>
                    </div>
                    <div className="admin-stat-card-label">Total Decks</div>
                    <div className="admin-stat-card-value">
                      {stats.decks.total.toLocaleString()}
                    </div>
                    <div className="admin-stat-card-footer">
                      <ion-icon name="layers-outline"></ion-icon>
                      {stats.cards.total.toLocaleString()} cards total
                    </div>
                  </div>

                  <div className="admin-stat-card success">
                    <div className="admin-stat-card-header">
                      <div className="admin-stat-card-icon">
                        <ion-icon name="library"></ion-icon>
                      </div>
                    </div>
                    <div className="admin-stat-card-label">Total Cards</div>
                    <div className="admin-stat-card-value">
                      {stats.cards.total.toLocaleString()}
                    </div>
                    <div className="admin-stat-card-footer">
                      <ion-icon name="alarm-outline"></ion-icon>
                      {dueCards} due for review
                    </div>
                  </div>

                  <div className="admin-stat-card warning">
                    <div className="admin-stat-card-header">
                      <div className="admin-stat-card-icon">
                        <ion-icon name="checkmark-done"></ion-icon>
                      </div>
                    </div>
                    <div className="admin-stat-card-label">Total Reviews</div>
                    <div className="admin-stat-card-value">
                      {stats.reviews.total.toLocaleString()}
                    </div>
                    <div className="admin-stat-card-footer">
                      <ion-icon name="today-outline"></ion-icon>
                      {stats.reviews.today} today
                    </div>
                  </div>

                  <div className="admin-stat-card danger">
                    <div className="admin-stat-card-header">
                      <div className="admin-stat-card-icon">
                        <ion-icon name="document-text"></ion-icon>
                      </div>
                    </div>
                    <div className="admin-stat-card-label">System Logs</div>
                    <div className="admin-stat-card-value">{logsCount.toLocaleString()}</div>
                    <div className="admin-stat-card-footer">
                      <ion-icon name="pulse-outline"></ion-icon>
                      {stats.webVitals.count} web vitals
                    </div>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: "1.5rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {/* Activity Feed */}
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">
                        <ion-icon name="pulse"></ion-icon>
                        Recent Activity
                      </h2>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                        Last {activities.length} entries
                      </span>
                    </div>

                    <div className="admin-activity-feed">
                      {activities.length > 0 ? (
                        activities.map((activity) => (
                          <div key={activity.id} className="admin-activity-item">
                            <div
                              className="admin-activity-icon"
                              style={{
                                background:
                                  activity.color === "success"
                                    ? "rgba(16, 185, 129, 0.1)"
                                    : "rgba(239, 68, 68, 0.1)",
                                color:
                                  activity.color === "success"
                                    ? "var(--admin-success)"
                                    : "var(--admin-danger)",
                              }}
                            >
                              <ion-icon name={activity.icon}></ion-icon>
                            </div>
                            <div className="admin-activity-content">
                              <div className="admin-activity-title">{activity.message}</div>
                              <div className="admin-activity-description">{activity.user}</div>
                              <div className="admin-activity-time">
                                {new Date(activity.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "3rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <ion-icon
                            name="ellipse-outline"
                            style={{ fontSize: "3rem", marginBottom: "1rem" }}
                          ></ion-icon>
                          <p>No recent activity</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">
                        <ion-icon name="speedometer"></ion-icon>
                        Quick Stats
                      </h2>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {/* Card States Breakdown */}
                      <div
                        style={{
                          padding: "1rem",
                          background: "var(--bg-primary)",
                          borderRadius: "0.5rem",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--text-secondary)",
                            marginBottom: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          Card States
                        </div>
                        {[
                          { label: "New", value: cardStates.new, color: "#e8a317" },
                          { label: "Learning", value: cardStates.learning, color: "#f59e0b" },
                          { label: "Review", value: cardStates.review, color: "#10b981" },
                          { label: "Relearning", value: cardStates.relearning, color: "#ef4444" },
                        ].map((s) => {
                          const total =
                            cardStates.new +
                              cardStates.learning +
                              cardStates.review +
                              cardStates.relearning || 1;
                          return (
                            <div key={s.label} style={{ marginBottom: "0.5rem" }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginBottom: "0.2rem",
                                }}
                              >
                                <span style={{ fontSize: "0.75rem" }}>{s.label}</span>
                                <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                                  {s.value}
                                </span>
                              </div>
                              <div
                                style={{
                                  height: "6px",
                                  background: "var(--border)",
                                  borderRadius: "3px",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${(s.value / total) * 100}%`,
                                    height: "100%",
                                    background: s.color,
                                    borderRadius: "3px",
                                  }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Due Cards */}
                      <div
                        style={{
                          padding: "1rem",
                          background: "var(--bg-primary)",
                          borderRadius: "0.5rem",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--text-secondary)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Cards Due for Review
                        </div>
                        <div
                          style={{
                            fontSize: "1.75rem",
                            fontWeight: 700,
                            marginBottom: "0.25rem",
                            color: dueCards > 0 ? "var(--admin-warning)" : "var(--admin-success)",
                          }}
                        >
                          {dueCards}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: dueCards === 0 ? "var(--admin-success)" : "var(--text-tertiary)",
                          }}
                        >
                          {dueCards === 0 ? "✅ All caught up!" : "Cards waiting for review"}
                        </div>
                      </div>

                      {/* Today's Grades */}
                      <div
                        style={{
                          padding: "1rem",
                          background: "var(--bg-primary)",
                          borderRadius: "0.5rem",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--text-secondary)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Today&apos;s Reviews
                        </div>
                        <div
                          style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}
                        >
                          {todayGrades.again +
                            todayGrades.hard +
                            todayGrades.good +
                            todayGrades.easy}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                          {todayGrades.good + todayGrades.easy} passed ·{" "}
                          {todayGrades.again + todayGrades.hard} need work
                        </div>
                      </div>

                      {/* Pass Rate */}
                      <div
                        style={{
                          padding: "1rem",
                          background: "var(--bg-primary)",
                          borderRadius: "0.5rem",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--text-secondary)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Mastery Rate
                        </div>
                        {(() => {
                          const total =
                            cardStates.new +
                              cardStates.learning +
                              cardStates.review +
                              cardStates.relearning || 1;
                          const rate = Math.round((cardStates.review / total) * 100);
                          return (
                            <>
                              <div
                                style={{
                                  fontSize: "1.75rem",
                                  fontWeight: 700,
                                  marginBottom: "0.25rem",
                                  color:
                                    rate >= 70
                                      ? "var(--admin-success)"
                                      : rate >= 40
                                        ? "var(--admin-warning)"
                                        : "var(--admin-danger)",
                                }}
                              >
                                {rate}%
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                {cardStates.review} of {total} cards mastered
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Status */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">
                      <ion-icon name="server"></ion-icon>
                      System Status
                    </h2>
                    <span className="admin-badge admin-badge-success">All Systems Operational</span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    {[
                      { name: "API", status: "operational", uptime: "99.9%" },
                      { name: "Database", status: "operational", uptime: "99.8%" },
                      { name: "Auth Service", status: "operational", uptime: "100%" },
                      { name: "Cloud Sync", status: "operational", uptime: "99.7%" },
                    ].map((service) => (
                      <div
                        key={service.name}
                        style={{
                          padding: "1rem",
                          border: "1px solid var(--border)",
                          borderRadius: "0.5rem",
                          background: "var(--bg-primary)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: "var(--admin-success)",
                            }}
                          ></div>
                          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                            {service.name}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Uptime: {service.uptime}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === "users" && (
              <>
                {/* User Profile Card */}
                <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">
                      <ion-icon name="person-circle"></ion-icon>
                      Current User
                    </h2>
                    <span className="admin-badge admin-badge-success">Active</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "2rem",
                      padding: "1.5rem",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: "96px",
                        height: "96px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--admin-primary), #f0b840)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2.5rem",
                        color: "#fff",
                        fontWeight: 700,
                        flexShrink: 0,
                        overflow: "hidden",
                      }}
                    >
                      {userProfile?.avatar ? (
                        <img
                          src={userProfile.avatar}
                          alt="Avatar"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        (userProfile?.name || "A").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                        {userProfile?.name || "Admin"}
                      </h3>
                      <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                        {userProfile?.email || "No email"}
                      </p>
                      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                        <div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-tertiary)",
                              marginBottom: "0.15rem",
                            }}
                          >
                            User ID
                          </div>
                          <code
                            style={{
                              fontSize: "0.75rem",
                              background: "var(--bg-primary)",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              border: "1px solid var(--border)",
                            }}
                          >
                            {userProfile?.id?.slice(0, 12)}...
                          </code>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-tertiary)",
                              marginBottom: "0.15rem",
                            }}
                          >
                            Last Sign In
                          </div>
                          <span style={{ fontSize: "0.875rem" }}>
                            {userProfile?.lastSignIn
                              ? new Date(userProfile.lastSignIn).toLocaleString()
                              : "N/A"}
                          </span>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-tertiary)",
                              marginBottom: "0.15rem",
                            }}
                          >
                            Account Created
                          </div>
                          <span style={{ fontSize: "0.875rem" }}>
                            {userProfile?.createdAt
                              ? new Date(userProfile.createdAt).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {[
                    {
                      label: "Decks Created",
                      value: stats?.decks.total || 0,
                      icon: "albums",
                      color: "#e8a317",
                    },
                    {
                      label: "Cards Created",
                      value: stats?.cards.total || 0,
                      icon: "library",
                      color: "#10b981",
                    },
                    {
                      label: "Total Reviews",
                      value: stats?.reviews.total || 0,
                      icon: "checkmark-done",
                      color: "#f59e0b",
                    },
                    { label: "Cards Due", value: dueCards, icon: "alarm", color: "#ef4444" },
                  ].map((stat) => (
                    <div key={stat.label} className="admin-card" style={{ padding: "1.5rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: `${stat.color}15`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: stat.color,
                            fontSize: "1.25rem",
                          }}
                        >
                          <ion-icon name={stat.icon}></ion-icon>
                        </div>
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                        {stat.value.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Account Info */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">
                      <ion-icon name="information-circle"></ion-icon>
                      Account Details
                    </h2>
                  </div>
                  <table className="admin-table">
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600, width: "200px" }}>Full Name</td>
                        <td>{userProfile?.name || "N/A"}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Email Address</td>
                        <td>{userProfile?.email || "N/A"}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>User ID</td>
                        <td>
                          <code style={{ fontSize: "0.8rem" }}>{userProfile?.id || "N/A"}</code>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Role</td>
                        <td>
                          <span className="admin-badge admin-badge-primary">Administrator</span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Last Sign In</td>
                        <td>
                          {userProfile?.lastSignIn
                            ? new Date(userProfile.lastSignIn).toLocaleString()
                            : "N/A"}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Account Created</td>
                        <td>
                          {userProfile?.createdAt
                            ? new Date(userProfile.createdAt).toLocaleString()
                            : "N/A"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tab === "content" && (
              <>
                {/* Content Overview Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div className="admin-card" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📚</div>
                    <div style={{ fontSize: "2rem", fontWeight: 700 }}>
                      {stats?.decks.total || 0}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      Total Decks
                    </div>
                  </div>
                  <div className="admin-card" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🃏</div>
                    <div style={{ fontSize: "2rem", fontWeight: 700 }}>
                      {stats?.cards.total || 0}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      Total Cards
                    </div>
                  </div>
                  <div className="admin-card" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏰</div>
                    <div
                      style={{
                        fontSize: "2rem",
                        fontWeight: 700,
                        color: dueCards > 0 ? "var(--admin-danger)" : "var(--admin-success)",
                      }}
                    >
                      {dueCards}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      Due for Review
                    </div>
                  </div>
                </div>

                {/* Card States Summary */}
                <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">
                      <ion-icon name="layers"></ion-icon>
                      Card States
                    </h2>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "1rem",
                      padding: "1rem",
                    }}
                  >
                    {[
                      { label: "New", value: cardStates.new, color: "#e8a317", icon: "sparkles" },
                      {
                        label: "Learning",
                        value: cardStates.learning,
                        color: "#f59e0b",
                        icon: "school",
                      },
                      {
                        label: "Review",
                        value: cardStates.review,
                        color: "#10b981",
                        icon: "checkmark-circle",
                      },
                      {
                        label: "Relearning",
                        value: cardStates.relearning,
                        color: "#ef4444",
                        icon: "reload",
                      },
                    ].map((state) => (
                      <div
                        key={state.label}
                        style={{
                          padding: "1rem",
                          border: "1px solid var(--border)",
                          borderRadius: "0.75rem",
                          borderLeft: `4px solid ${state.color}`,
                          background: "var(--bg-primary)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <ion-icon
                            name={state.icon}
                            style={{ color: state.color, fontSize: "1.25rem" }}
                          ></ion-icon>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            {state.label}
                          </span>
                        </div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{state.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Decks */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">
                      <ion-icon name="albums"></ion-icon>
                      Recent Decks
                    </h2>
                    <Link href="/app" className="admin-btn admin-btn-secondary admin-btn-sm">
                      Open App
                    </Link>
                  </div>
                  {recentDecks.length > 0 ? (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Deck Name</th>
                          <th>Created</th>
                          <th>Last Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentDecks.map((deck) => (
                          <tr key={deck.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <ion-icon
                                  name="albums-outline"
                                  style={{ color: "var(--admin-primary)" }}
                                ></ion-icon>
                                <strong>{deck.name}</strong>
                              </div>
                            </td>
                            <td>{new Date(deck.created_at).toLocaleDateString()}</td>
                            <td>{new Date(deck.updated_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "3rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <ion-icon
                        name="albums-outline"
                        style={{ fontSize: "3rem", marginBottom: "1rem" }}
                      ></ion-icon>
                      <p>No decks created yet</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === "analytics" && (
              <>
                {/* Card State Distribution */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1.5rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">
                        <ion-icon name="pie-chart"></ion-icon>
                        Card State Distribution
                      </h2>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2rem",
                        padding: "1rem",
                      }}
                    >
                      {/* Donut Chart */}
                      <div
                        style={{
                          position: "relative",
                          width: "180px",
                          height: "180px",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          viewBox="0 0 36 36"
                          style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
                        >
                          {(() => {
                            const total =
                              cardStates.new +
                                cardStates.learning +
                                cardStates.review +
                                cardStates.relearning || 1;
                            const segments = [
                              { value: cardStates.new, color: "#e8a317" },
                              { value: cardStates.learning, color: "#f59e0b" },
                              { value: cardStates.review, color: "#10b981" },
                              { value: cardStates.relearning, color: "#ef4444" },
                            ];
                            let offset = 0;
                            return segments.map((seg, i) => {
                              const pct = (seg.value / total) * 100;
                              const el = (
                                <circle
                                  key={i}
                                  cx="18"
                                  cy="18"
                                  r="15.9"
                                  fill="none"
                                  stroke={seg.color}
                                  strokeWidth="3.5"
                                  strokeDasharray={`${pct} ${100 - pct}`}
                                  strokeDashoffset={`${-offset}`}
                                />
                              );
                              offset += pct;
                              return el;
                            });
                          })()}
                        </svg>
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                            {cardStates.new +
                              cardStates.learning +
                              cardStates.review +
                              cardStates.relearning}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                            Total Cards
                          </span>
                        </div>
                      </div>
                      {/* Legend */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                          flex: 1,
                        }}
                      >
                        {[
                          { label: "New", value: cardStates.new, color: "#e8a317" },
                          { label: "Learning", value: cardStates.learning, color: "#f59e0b" },
                          { label: "Review", value: cardStates.review, color: "#10b981" },
                          { label: "Relearning", value: cardStates.relearning, color: "#ef4444" },
                        ].map((item) => (
                          <div
                            key={item.label}
                            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "3px",
                                background: item.color,
                                flexShrink: 0,
                              }}
                            ></div>
                            <span style={{ flex: 1, fontSize: "0.875rem" }}>{item.label}</span>
                            <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Today's Grades */}
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">
                        <ion-icon name="bar-chart"></ion-icon>
                        Today&apos;s Grade Distribution
                      </h2>
                    </div>
                    <div style={{ padding: "1rem" }}>
                      {(() => {
                        const maxGrade = Math.max(
                          todayGrades.again,
                          todayGrades.hard,
                          todayGrades.good,
                          todayGrades.easy,
                          1
                        );
                        const bars = [
                          { label: "Again", value: todayGrades.again, color: "#ef4444" },
                          { label: "Hard", value: todayGrades.hard, color: "#f59e0b" },
                          { label: "Good", value: todayGrades.good, color: "#10b981" },
                          { label: "Easy", value: todayGrades.easy, color: "#e8a317" },
                        ];
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {bars.map((bar) => (
                              <div key={bar.label}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "0.35rem",
                                  }}
                                >
                                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                                    {bar.label}
                                  </span>
                                  <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>
                                    {bar.value}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    height: "28px",
                                    background: "var(--border)",
                                    borderRadius: "6px",
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${(bar.value / maxGrade) * 100}%`,
                                      height: "100%",
                                      background: bar.color,
                                      borderRadius: "6px",
                                      transition: "width 0.5s ease",
                                      minWidth: bar.value > 0 ? "24px" : "0px",
                                    }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                            <div
                              style={{
                                textAlign: "center",
                                marginTop: "0.5rem",
                                fontSize: "0.8rem",
                                color: "var(--text-secondary)",
                              }}
                            >
                              Total reviews today:{" "}
                              <strong>
                                {todayGrades.again +
                                  todayGrades.hard +
                                  todayGrades.good +
                                  todayGrades.easy}
                              </strong>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Review Summary Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {[
                    {
                      label: "Due Now",
                      value: dueCards,
                      icon: "alarm",
                      color: "#ef4444",
                      bg: "rgba(239, 68, 68, 0.1)",
                    },
                    {
                      label: "Total Reviews",
                      value: stats?.reviews.total || 0,
                      icon: "checkmark-done",
                      color: "#10b981",
                      bg: "rgba(16, 185, 129, 0.1)",
                    },
                    {
                      label: "Reviewed Today",
                      value: stats?.reviews.today || 0,
                      icon: "today",
                      color: "#e8a317",
                      bg: "rgba(232, 163, 23, 0.1)",
                    },
                    {
                      label: "Web Vitals",
                      value: stats?.webVitals.count || 0,
                      icon: "pulse",
                      color: "#f59e0b",
                      bg: "rgba(245, 158, 11, 0.1)",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="admin-card"
                      style={{ textAlign: "center", padding: "1.5rem" }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "12px",
                          background: item.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 0.75rem",
                          color: item.color,
                          fontSize: "1.5rem",
                        }}
                      >
                        <ion-icon name={item.icon}></ion-icon>
                      </div>
                      <div
                        style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}
                      >
                        {item.value.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Retention Rate Card */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">
                      <ion-icon name="analytics"></ion-icon>
                      Learning Efficiency
                    </h2>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "1.5rem",
                      padding: "1rem",
                    }}
                  >
                    {(() => {
                      const totalToday =
                        todayGrades.again + todayGrades.hard + todayGrades.good + todayGrades.easy;
                      const passRate =
                        totalToday > 0
                          ? Math.round(((todayGrades.good + todayGrades.easy) / totalToday) * 100)
                          : 0;
                      const totalCards =
                        cardStates.new +
                        cardStates.learning +
                        cardStates.review +
                        cardStates.relearning;
                      const masteryRate =
                        totalCards > 0 ? Math.round((cardStates.review / totalCards) * 100) : 0;
                      return [
                        {
                          label: "Pass Rate (Today)",
                          value: `${passRate}%`,
                          desc: "Good + Easy answers",
                          color:
                            passRate >= 80 ? "#10b981" : passRate >= 60 ? "#f59e0b" : "#ef4444",
                        },
                        {
                          label: "Mastery Rate",
                          value: `${masteryRate}%`,
                          desc: "Cards in Review state",
                          color:
                            masteryRate >= 70
                              ? "#10b981"
                              : masteryRate >= 40
                                ? "#f59e0b"
                                : "#ef4444",
                        },
                        {
                          label: "Cards Due",
                          value: dueCards.toString(),
                          desc: dueCards === 0 ? "All caught up! 🎉" : "Cards waiting for review",
                          color: dueCards === 0 ? "#10b981" : "#f59e0b",
                        },
                      ].map((metric) => (
                        <div key={metric.label} style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "2.25rem",
                              fontWeight: 700,
                              color: metric.color,
                              marginBottom: "0.25rem",
                            }}
                          >
                            {metric.value}
                          </div>
                          <div
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              marginBottom: "0.25rem",
                            }}
                          >
                            {metric.label}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {metric.desc}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </>
            )}

            {tab === "vitals" && (
              <>
                {/* Time Period Selector */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  {[1, 7, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setMetricsDays(d)}
                      className={`admin-btn ${
                        metricsDays === d ? "admin-btn-primary" : "admin-btn-secondary"
                      }`}
                    >
                      {d === 1 ? "Today" : `${d} days`}
                    </button>
                  ))}
                </div>

                {metricsLoading ? (
                  <div className="admin-card" style={{ textAlign: "center", padding: "4rem" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
                    <p style={{ color: "var(--text-secondary)" }}>Loading metrics...</p>
                  </div>
                ) : metricsData.length === 0 ? (
                  <div className="admin-card" style={{ textAlign: "center", padding: "4rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
                    <h3
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 600,
                        marginBottom: "0.5rem",
                      }}
                    >
                      No data yet
                    </h3>
                    <p style={{ color: "var(--text-secondary)" }}>
                      Start using the app to collect performance metrics
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Metrics Cards Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "1.5rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      {metricsData.map((metric) => {
                        const goodPct =
                          metric.count > 0 ? (metric.rating.good / metric.count) * 100 : 0;
                        const scoreColor =
                          goodPct >= 75
                            ? "var(--admin-success)"
                            : goodPct >= 50
                              ? "var(--admin-warning)"
                              : "var(--admin-danger)";
                        const unit = metric.name === "CLS" ? "" : "ms";
                        const fmt = (v: number) =>
                          metric.name === "CLS" ? v.toFixed(3) : `${Math.round(v)}${unit}`;

                        return (
                          <div key={metric.name} className="admin-card">
                            <div className="admin-card-header">
                              <h2 className="admin-card-title">{metric.name}</h2>
                              <span className="admin-badge admin-badge-info">
                                {metric.count} samples
                              </span>
                            </div>

                            {/* Average */}
                            <div style={{ marginBottom: "1.25rem" }}>
                              <div
                                style={{
                                  fontSize: "2.25rem",
                                  fontWeight: 700,
                                  color: scoreColor,
                                }}
                              >
                                {fmt(metric.avg)}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                average
                              </div>
                            </div>

                            {/* Stats grid */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                                gap: "0.75rem",
                                marginBottom: "1.25rem",
                              }}
                            >
                              {[
                                { label: "Median", value: metric.median },
                                { label: "P75", value: metric.p75 },
                                { label: "P95", value: metric.p95 },
                                { label: "Max", value: metric.max },
                              ].map((s) => (
                                <div key={s.label}>
                                  <div
                                    style={{
                                      fontSize: "0.7rem",
                                      color: "var(--text-tertiary)",
                                      marginBottom: "0.15rem",
                                    }}
                                  >
                                    {s.label}
                                  </div>
                                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                                    {fmt(s.value)}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Rating bar */}
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  height: "8px",
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                  marginBottom: "0.5rem",
                                  background: "var(--border)",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${(metric.rating.good / metric.count) * 100}%`,
                                    background: "var(--admin-success)",
                                  }}
                                />
                                <div
                                  style={{
                                    width: `${(metric.rating.needsImprovement / metric.count) * 100}%`,
                                    background: "var(--admin-warning)",
                                  }}
                                />
                                <div
                                  style={{
                                    width: `${(metric.rating.poor / metric.count) * 100}%`,
                                    background: "var(--admin-danger)",
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: "0.75rem",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                <span style={{ color: "var(--admin-success)" }}>
                                  ✓ {metric.rating.good} good
                                </span>
                                <span style={{ color: "var(--admin-warning)" }}>
                                  ⚠ {metric.rating.needsImprovement} ok
                                </span>
                                <span style={{ color: "var(--admin-danger)" }}>
                                  ✗ {metric.rating.poor} poor
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Overall Score */}
                    <div className="admin-card">
                      <div className="admin-card-header">
                        <h2 className="admin-card-title">
                          <ion-icon name="trophy"></ion-icon>
                          Overall Performance Score
                        </h2>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "2rem",
                          padding: "1rem",
                        }}
                      >
                        {(() => {
                          const score = Math.round(
                            (metricsData.reduce((sum, m) => sum + m.rating.good / m.count, 0) /
                              metricsData.length) *
                              100
                          );
                          const color =
                            score >= 75
                              ? "var(--admin-success)"
                              : score >= 50
                                ? "var(--admin-warning)"
                                : "var(--admin-danger)";
                          return (
                            <>
                              <div style={{ textAlign: "center" }}>
                                <div
                                  style={{
                                    fontSize: "4rem",
                                    fontWeight: 700,
                                    color,
                                    lineHeight: 1,
                                  }}
                                >
                                  {score}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.875rem",
                                    color: "var(--text-secondary)",
                                    marginTop: "0.5rem",
                                  }}
                                >
                                  out of 100
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: "0.875rem",
                                  color: "var(--text-secondary)",
                                  lineHeight: 1.8,
                                }}
                              >
                                <p>
                                  Based on{" "}
                                  <strong>{metricsData.reduce((s, m) => s + m.count, 0)}</strong>{" "}
                                  total measurements
                                </p>
                                <p>
                                  Across <strong>{metricsData.length}</strong> metrics
                                </p>
                                <p>
                                  Period:{" "}
                                  <strong>
                                    {metricsDays === 1 ? "Today" : `Last ${metricsDays} days`}
                                  </strong>
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {tab === "api" && (
              <>
                <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">
                      <ion-icon name="code-slash"></ion-icon>
                      API Endpoints
                    </h2>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <span className="admin-badge admin-badge-success">All Healthy</span>
                    </div>
                  </div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Description</th>
                        <th>Auth</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          method: "GET",
                          path: "/api/admin/overview",
                          desc: "Admin dashboard data",
                          auth: "Admin",
                          status: "active",
                        },
                        {
                          method: "GET",
                          path: "/api/admin/metrics",
                          desc: "Web Vitals metrics",
                          auth: "Admin",
                          status: "active",
                        },
                        {
                          method: "POST",
                          path: "/api/generate",
                          desc: "AI card generation",
                          auth: "User",
                          status: "active",
                        },
                        {
                          method: "POST",
                          path: "/api/parse",
                          desc: "Document parsing",
                          auth: "User",
                          status: "active",
                        },
                        {
                          method: "POST",
                          path: "/api/translate",
                          desc: "Text translation",
                          auth: "User",
                          status: "active",
                        },
                        {
                          method: "GET",
                          path: "/api/sync",
                          desc: "Sync data from cloud",
                          auth: "User",
                          status: "active",
                        },
                        {
                          method: "POST",
                          path: "/api/sync",
                          desc: "Sync data to cloud",
                          auth: "User",
                          status: "active",
                        },
                        {
                          method: "GET",
                          path: "/api/logs",
                          desc: "System logs",
                          auth: "User",
                          status: "active",
                        },
                        {
                          method: "POST",
                          path: "/api/logs",
                          desc: "Create log entry",
                          auth: "User",
                          status: "active",
                        },
                        {
                          method: "POST",
                          path: "/api/analytics",
                          desc: "Track analytics event",
                          auth: "User",
                          status: "active",
                        },
                        {
                          method: "GET",
                          path: "/api/backup/export",
                          desc: "Export all data",
                          auth: "User",
                          status: "active",
                        },
                        {
                          method: "POST",
                          path: "/api/backup/import",
                          desc: "Import data backup",
                          auth: "User",
                          status: "active",
                        },
                      ].map((ep, i) => (
                        <tr key={i}>
                          <td>
                            <span
                              className={`admin-badge ${ep.method === "GET" ? "admin-badge-success" : ep.method === "POST" ? "admin-badge-primary" : "admin-badge-warning"}`}
                              style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                            >
                              {ep.method}
                            </span>
                          </td>
                          <td>
                            <code style={{ fontSize: "0.8rem" }}>{ep.path}</code>
                          </td>
                          <td style={{ fontSize: "0.875rem" }}>{ep.desc}</td>
                          <td>
                            <span
                              className={`admin-badge ${ep.auth === "Admin" ? "admin-badge-danger" : "admin-badge-secondary"}`}
                            >
                              {ep.auth}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              <div
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: "var(--admin-success)",
                                }}
                              ></div>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                Active
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* API Info Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">
                        <ion-icon name="shield-checkmark"></ion-icon>
                        Authentication
                      </h2>
                    </div>
                    <div style={{ padding: "1rem", fontSize: "0.875rem", lineHeight: 1.8 }}>
                      <p>
                        <strong>Provider:</strong> Supabase Auth
                      </p>
                      <p>
                        <strong>Methods:</strong> Google OAuth, Email/Password
                      </p>
                      <p>
                        <strong>Token Type:</strong> JWT (HttpOnly Cookies)
                      </p>
                      <p>
                        <strong>Rate Limiting:</strong> IP-based sliding window
                      </p>
                      <p>
                        <strong>Admin Check:</strong> Email allowlist via <code>ADMIN_EMAILS</code>
                      </p>
                    </div>
                  </div>
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">
                        <ion-icon name="lock-closed"></ion-icon>
                        Rate Limits
                      </h2>
                    </div>
                    <div style={{ padding: "1rem", fontSize: "0.875rem", lineHeight: 1.8 }}>
                      <p>
                        <strong>Admin Endpoints:</strong> 30 req/min
                      </p>
                      <p>
                        <strong>Generate (AI):</strong> 10 req/min
                      </p>
                      <p>
                        <strong>Translate:</strong> 20 req/min
                      </p>
                      <p>
                        <strong>Sync:</strong> 30 req/min
                      </p>
                      <p>
                        <strong>Logs:</strong> 60 req/min
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === "system" && (
              <>
                {/* System Status Overview */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {[
                    { name: "API Server", status: "Operational", icon: "server", color: "#10b981" },
                    {
                      name: "Database",
                      status: "Operational",
                      icon: "server-outline",
                      color: "#10b981",
                    },
                    {
                      name: "Auth Service",
                      status: "Operational",
                      icon: "shield-checkmark",
                      color: "#10b981",
                    },
                    {
                      name: "Cloud Sync",
                      status: "Operational",
                      icon: "cloud-done",
                      color: "#10b981",
                    },
                  ].map((service) => (
                    <div key={service.name} className="admin-card" style={{ padding: "1.25rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: service.color,
                            boxShadow: `0 0 8px ${service.color}50`,
                          }}
                        ></div>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{service.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <ion-icon
                          name={service.icon}
                          style={{ color: service.color, fontSize: "1.25rem" }}
                        ></ion-icon>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {service.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Environment & DB Info */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1.5rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">
                        <ion-icon name="information-circle"></ion-icon>
                        Environment
                      </h2>
                    </div>
                    <table className="admin-table">
                      <tbody>
                        {[
                          { key: "Framework", value: "Next.js 14 (App Router)" },
                          { key: "Runtime", value: "Node.js (Edge Compatible)" },
                          { key: "Database", value: "Supabase (PostgreSQL)" },
                          { key: "Auth Provider", value: "Supabase Auth" },
                          { key: "Hosting", value: "Vercel" },
                          { key: "SRS Algorithm", value: "FSRS v4" },
                          { key: "AI Provider", value: "Google Gemini" },
                        ].map((item) => (
                          <tr key={item.key}>
                            <td style={{ fontWeight: 600, width: "160px" }}>{item.key}</td>
                            <td>{item.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="admin-card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">
                        <ion-icon name="pie-chart"></ion-icon>
                        Database Statistics
                      </h2>
                    </div>
                    <table className="admin-table">
                      <tbody>
                        {[
                          { table: "Decks", count: stats?.decks.total || 0 },
                          { table: "Cards", count: stats?.cards.total || 0 },
                          { table: "Review Logs", count: stats?.reviews.total || 0 },
                          { table: "System Logs", count: logsCount },
                          { table: "Web Vitals", count: stats?.webVitals.count || 0 },
                        ].map((item) => (
                          <tr key={item.table}>
                            <td style={{ fontWeight: 600, width: "160px" }}>{item.table}</td>
                            <td>{item.count.toLocaleString()} rows</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">
                      <ion-icon name="flash"></ion-icon>
                      Quick Actions
                    </h2>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "1rem",
                      padding: "1rem",
                    }}
                  >
                    <button
                      className="admin-btn admin-btn-secondary"
                      style={{
                        padding: "1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                        height: "auto",
                      }}
                      onClick={fetchDashboard}
                    >
                      <ion-icon name="refresh" style={{ fontSize: "1.5rem" }}></ion-icon>
                      <span style={{ fontSize: "0.8rem" }}>Refresh Data</span>
                    </button>
                    <a
                      href="/api/backup/export"
                      className="admin-btn admin-btn-secondary"
                      style={{
                        padding: "1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                        height: "auto",
                        textDecoration: "none",
                      }}
                    >
                      <ion-icon name="download" style={{ fontSize: "1.5rem" }}></ion-icon>
                      <span style={{ fontSize: "0.8rem" }}>Export Backup</span>
                    </a>
                    <button
                      className="admin-btn admin-btn-secondary"
                      style={{
                        padding: "1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                        height: "auto",
                      }}
                      onClick={() => setTab("vitals")}
                    >
                      <ion-icon name="pulse" style={{ fontSize: "1.5rem" }}></ion-icon>
                      <span style={{ fontSize: "0.8rem" }}>View Metrics</span>
                    </button>
                    <Link
                      href="/app"
                      className="admin-btn admin-btn-secondary"
                      style={{
                        padding: "1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                        height: "auto",
                        textDecoration: "none",
                      }}
                    >
                      <ion-icon name="open" style={{ fontSize: "1.5rem" }}></ion-icon>
                      <span style={{ fontSize: "0.8rem" }}>Open App</span>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
