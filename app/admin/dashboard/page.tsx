"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  DashboardStats,
  CardStates,
  TodayGrades,
  RecentDeck,
  UserProfile,
  ActivityItem,
  MetricSummary,
  Tab,
} from "./_components/types";
import { OverviewTab } from "./_components/OverviewTab";
import { UsersTab } from "./_components/UsersTab";
import { ContentTab } from "./_components/ContentTab";
import { AnalyticsTab } from "./_components/AnalyticsTab";
import { VitalsTab } from "./_components/VitalsTab";
import { ApiTab } from "./_components/ApiTab";
import { SystemTab } from "./_components/SystemTab";

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
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>
              <ion-icon name="ban-outline"></ion-icon>
            </div>
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
            <span className="admin-sidebar-logo">
              <ion-icon name="flash"></ion-icon>
            </span>
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
              <OverviewTab
                stats={stats}
                activities={activities}
                cardStates={cardStates}
                todayGrades={todayGrades}
                dueCards={dueCards}
                logsCount={logsCount}
              />
            )}
            {tab === "users" && (
              <UsersTab stats={stats} userProfile={userProfile} dueCards={dueCards} />
            )}
            {tab === "content" && (
              <ContentTab
                stats={stats}
                cardStates={cardStates}
                dueCards={dueCards}
                recentDecks={recentDecks}
              />
            )}
            {tab === "analytics" && (
              <AnalyticsTab
                stats={stats}
                cardStates={cardStates}
                todayGrades={todayGrades}
                dueCards={dueCards}
              />
            )}
            {tab === "vitals" && (
              <VitalsTab
                metricsData={metricsData}
                metricsLoading={metricsLoading}
                metricsDays={metricsDays}
                setMetricsDays={setMetricsDays}
              />
            )}
            {tab === "api" && <ApiTab />}
            {tab === "system" && (
              <SystemTab
                stats={stats}
                logsCount={logsCount}
                onRefresh={fetchDashboard}
                onViewVitals={() => setTab("system")}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
}
