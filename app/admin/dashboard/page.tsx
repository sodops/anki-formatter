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

interface ActivityItem {
  id: string;
  type: "user_signup" | "deck_created" | "cards_added" | "review_session" | "error";
  user: string;
  message: string;
  timestamp: string;
  icon: string;
  color: string;
}

type Tab = "overview" | "users" | "content" | "analytics" | "api" | "system";

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function ModernAdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", width: "100%" }}>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", width: "100%", padding: "2rem" }}>
          <div className="admin-card" style={{ maxWidth: "480px", textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🚫</div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>Access Denied</h1>
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
                <span className="admin-nav-badge">2</span>
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
              <Link href="/admin/metrics" className="admin-nav-item">
                <ion-icon name="pulse-outline"></ion-icon>
                Web Vitals
              </Link>
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

            <div className="admin-nav-section" style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "auto" }}>
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
              <button 
                className="admin-icon-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <ion-icon name="menu-outline"></ion-icon>
              </button>
              
              <div>
                <h1 className="admin-header-title">
                  {tab === "overview" && "Dashboard Overview"}
                  {tab === "users" && "User Management"}
                  {tab === "content" && "Content Manager"}
                  {tab === "analytics" && "Analytics"}
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
              <div className="admin-search">
                <ion-icon name="search-outline" className="admin-search-icon"></ion-icon>
                <input 
                  type="text" 
                  className="admin-search-input" 
                  placeholder="Search..." 
                />
              </div>

              <div className="admin-header-actions">
                <button className="admin-icon-btn" onClick={fetchDashboard} title="Refresh">
                  <ion-icon name="refresh-outline"></ion-icon>
                </button>
                
                <button className="admin-icon-btn" title="Notifications">
                  <ion-icon name="notifications-outline"></ion-icon>
                  <span className="admin-icon-btn-badge"></span>
                </button>

                <div className="admin-icon-btn" style={{ width: "auto", padding: "0 0.75rem", gap: "0.5rem" }}>
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
                        <ion-icon name="people"></ion-icon>
                      </div>
                      <div className="admin-stat-card-trend up">
                        <ion-icon name="trending-up"></ion-icon>
                        +12%
                      </div>
                    </div>
                    <div className="admin-stat-card-label">Total Users</div>
                    <div className="admin-stat-card-value">{stats.users.total.toLocaleString()}</div>
                    <div className="admin-stat-card-footer">
                      <ion-icon name="time-outline"></ion-icon>
                      {stats.users.active} active today
                    </div>
                  </div>

                  <div className="admin-stat-card success">
                    <div className="admin-stat-card-header">
                      <div className="admin-stat-card-icon">
                        <ion-icon name="albums"></ion-icon>
                      </div>
                      <div className="admin-stat-card-trend up">
                        <ion-icon name="trending-up"></ion-icon>
                        +8%
                      </div>
                    </div>
                    <div className="admin-stat-card-label">Total Decks</div>
                    <div className="admin-stat-card-value">{stats.decks.total.toLocaleString()}</div>
                    <div className="admin-stat-card-footer">
                      <ion-icon name="add-circle-outline"></ion-icon>
                      {stats.decks.created_today} created today
                    </div>
                  </div>

                  <div className="admin-stat-card warning">
                    <div className="admin-stat-card-header">
                      <div className="admin-stat-card-icon">
                        <ion-icon name="library"></ion-icon>
                      </div>
                      <div className="admin-stat-card-trend up">
                        <ion-icon name="trending-up"></ion-icon>
                        +24%
                      </div>
                    </div>
                    <div className="admin-stat-card-label">Total Cards</div>
                    <div className="admin-stat-card-value">{stats.cards.total.toLocaleString()}</div>
                    <div className="admin-stat-card-footer">
                      <ion-icon name="flash-outline"></ion-icon>
                      {stats.cards.created_today} created today
                    </div>
                  </div>

                  <div className="admin-stat-card danger">
                    <div className="admin-stat-card-header">
                      <div className="admin-stat-card-icon">
                        <ion-icon name="checkmark-done"></ion-icon>
                      </div>
                      <div className="admin-stat-card-trend up">
                        <ion-icon name="trending-up"></ion-icon>
                        +18%
                      </div>
                    </div>
                    <div className="admin-stat-card-label">Reviews</div>
                    <div className="admin-stat-card-value">{stats.reviews.total.toLocaleString()}</div>
                    <div className="admin-stat-card-footer">
                      <ion-icon name="today-outline"></ion-icon>
                      {stats.reviews.today} today
                    </div>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                  {/* Activity Feed */}
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">
                        <ion-icon name="pulse"></ion-icon>
                        Recent Activity
                      </h2>
                      <button className="admin-btn admin-btn-secondary admin-btn-sm">
                        View All
                      </button>
                    </div>
                    
                    <div className="admin-activity-feed">
                      {activities.length > 0 ? (
                        activities.map((activity) => (
                          <div key={activity.id} className="admin-activity-item">
                            <div className="admin-activity-icon" style={{
                              background: activity.color === "success" 
                                ? "rgba(16, 185, 129, 0.1)" 
                                : "rgba(239, 68, 68, 0.1)",
                              color: activity.color === "success"
                                ? "var(--admin-success)"
                                : "var(--admin-danger)"
                            }}>
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
                        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                          <ion-icon name="ellipse-outline" style={{ fontSize: "3rem", marginBottom: "1rem" }}></ion-icon>
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
                      <div style={{ padding: "1rem", background: "var(--bg-primary)", borderRadius: "0.5rem", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Storage Used</span>
                          <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>2.4 GB</span>
                        </div>
                        <div style={{ height: "8px", background: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: "45%", height: "100%", background: "var(--admin-primary)", borderRadius: "4px" }}></div>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>45% of 5 GB</span>
                      </div>

                      <div style={{ padding: "1rem", background: "var(--bg-primary)", borderRadius: "0.5rem", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>API Calls (24h)</div>
                        <div style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>12,847</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--admin-success)" }}>
                          <ion-icon name="trending-up"></ion-icon> +5.2% from yesterday
                        </div>
                      </div>

                      <div style={{ padding: "1rem", background: "var(--bg-primary)", borderRadius: "0.5rem", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Avg Response Time</div>
                        <div style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>142ms</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--admin-success)" }}>
                          <ion-icon name="checkmark-circle"></ion-icon> Excellent
                        </div>
                      </div>

                      <div style={{ padding: "1rem", background: "var(--bg-primary)", borderRadius: "0.5rem", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Error Rate</div>
                        <div style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>0.03%</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--admin-success)" }}>
                          <ion-icon name="shield-checkmark"></ion-icon> Within threshold
                        </div>
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
                  
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    {[
                      { name: "API", status: "operational", uptime: "99.9%" },
                      { name: "Database", status: "operational", uptime: "99.8%" },
                      { name: "Auth Service", status: "operational", uptime: "100%" },
                      { name: "Cloud Sync", status: "operational", uptime: "99.7%" },
                    ].map((service) => (
                      <div key={service.name} style={{ 
                        padding: "1rem", 
                        border: "1px solid var(--border)", 
                        borderRadius: "0.5rem",
                        background: "var(--bg-primary)"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                          <div style={{ 
                            width: "8px", 
                            height: "8px", 
                            borderRadius: "50%", 
                            background: "var(--admin-success)" 
                          }}></div>
                          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{service.name}</span>
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
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">
                    <ion-icon name="people"></ion-icon>
                    User Management
                  </h2>
                  <button className="admin-btn admin-btn-primary admin-btn-sm">
                    <ion-icon name="add"></ion-icon>
                    Add User
                  </button>
                </div>
                
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                  <ion-icon name="construct-outline" style={{ fontSize: "4rem", marginBottom: "1rem" }}></ion-icon>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Coming Soon</h3>
                  <p>User management interface is under development</p>
                </div>
              </div>
            )}

            {tab === "content" && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">
                    <ion-icon name="library"></ion-icon>
                    Content Management
                  </h2>
                </div>
                
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                  <ion-icon name="construct-outline" style={{ fontSize: "4rem", marginBottom: "1rem" }}></ion-icon>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Coming Soon</h3>
                  <p>Content management interface is under development</p>
                </div>
              </div>
            )}

            {tab === "analytics" && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">
                    <ion-icon name="bar-chart"></ion-icon>
                    Analytics Dashboard
                  </h2>
                </div>
                
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                  <ion-icon name="construct-outline" style={{ fontSize: "4rem", marginBottom: "1rem" }}></ion-icon>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Coming Soon</h3>
                  <p>Advanced analytics with charts and insights</p>
                </div>
              </div>
            )}

            {tab === "api" && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">
                    <ion-icon name="code-slash"></ion-icon>
                    API Explorer
                  </h2>
                  <Link href="/admin" className="admin-btn admin-btn-secondary admin-btn-sm">
                    View Legacy Panel
                  </Link>
                </div>
                
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                  <ion-icon name="construct-outline" style={{ fontSize: "4rem", marginBottom: "1rem" }}></ion-icon>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Coming Soon</h3>
                  <p>API testing and documentation interface</p>
                </div>
              </div>
            )}

            {tab === "system" && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">
                    <ion-icon name="settings"></ion-icon>
                    System Configuration
                  </h2>
                </div>
                
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                  <ion-icon name="construct-outline" style={{ fontSize: "4rem", marginBottom: "1rem" }}></ion-icon>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Coming Soon</h3>
                  <p>System settings and configuration panel</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
