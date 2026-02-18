"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

interface Assignment {
  id: string;
  title: string;
  description: string;
  group_id: string;
  group_name?: string;
  group_color?: string;
  deadline: string | null;
  xp_reward: number;
  status: string;
  my_progress?: {
    status: string;
    cards_studied: number;
    cards_mastered: number;
    accuracy: number;
    total_reviews: number;
    time_spent_minutes: number;
    xp_earned: number;
  };
  assignment_decks?: { deck_id: string; deck_name: string }[];
}

interface Group {
  id: string;
  name: string;
  description: string;
  color: string;
  member_count: number;
  assignment_count: number;
  joined_at: string;
}

interface XPData {
  total_xp: number;
  today_xp: number;
  level: number;
  xp_to_next: number;
  current_streak: number;
  longest_streak: number;
  recent_events: { event_type: string; xp_amount: number; created_at: string }[];
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function StudentDashboard() {
  const { user, loading, role, signOut } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"dashboard" | "assignments" | "groups" | "statistics" | "notifications" | "settings">("dashboard");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [xp, setXP] = useState<XPData>({ total_xp: 0, today_xp: 0, level: 1, xp_to_next: 100, current_streak: 0, longest_streak: 0, recent_events: [] });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const fetchData = useCallback(async () => {
    try {
      const [aRes, gRes, xRes, nRes] = await Promise.all([
        fetch("/api/assignments").catch(() => null),
        fetch("/api/groups").catch(() => null),
        fetch("/api/xp").catch(() => null),
        fetch("/api/notifications").catch(() => null),
      ]);

      if (aRes?.ok) {
        const d = await aRes.json();
        setAssignments(d.assignments || []);
      }
      if (gRes?.ok) {
        const d = await gRes.json();
        setGroups(d.groups || []);
      }
      if (xRes?.ok) {
        const d = await xRes.json();
        setXP(d);
      }
      if (nRes?.ok) {
        const d = await nRes.json();
        setNotifications(d.notifications || []);
        setUnreadCount(d.unread_count || 0);
      }
    } catch {} finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) fetchData();
  }, [loading, user, fetchData]);

  // Redirect teacher/admin to their dashboard (only after auth is fully loaded)
  useEffect(() => {
    if (!loading && user && (role === "teacher" || role === "admin")) {
      window.location.href = "/teacher";
    }
  }, [loading, user, role]);

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoiningGroup(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ join_code: joinCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");
      setJoinSuccess(`Joined "${data.group?.name || 'group'}" successfully!`);
      setJoinCode("");
      fetchData();
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setJoiningGroup(false);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f14', color: '#fff' }}>
        <div className="s-spinner" />
        <span style={{ marginTop: 12 }}>Loading...</span>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f14', color: '#fff' }}>
        <span>Redirecting to login...</span>
      </div>
    );
  }

  // Role guard: teacher on student page → redirect (loading is guaranteed false here)
  if (role === "teacher" || role === "admin") {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f14', color: '#fff', gap: 12 }}>
        <div className="s-spinner" />
        <p style={{ color: '#94a3b8' }}>Redirecting to teacher dashboard...</p>
      </div>
    );
  }

  const level = xp.level || Math.floor(xp.total_xp / 100) + 1;
  const xpInLevel = xp.total_xp % 100;
  const overdueAssignments = assignments.filter(a => a.deadline && new Date(a.deadline) < new Date() && a.my_progress?.status !== "completed");
  const activeAssignments = assignments.filter(a => a.status === "active" && a.my_progress?.status !== "completed");
  const completedAssignments = assignments.filter(a => a.my_progress?.status === "completed");

  return (
    <div className="s-dashboard">
      {/* Mobile Header */}
      <div className="s-mobile-header">
        <button className="s-hamburger" onClick={() => setSidebarOpen(true)}>
          <ion-icon name="menu-outline"></ion-icon>
        </button>
        <span className="s-brand-icon">⚡</span>
        <span className="s-brand-name">AnkiFlow</span>
        <span className="s-role-tag">Student</span>
      </div>
      
      {/* Mobile Overlay */}
      <div className={`s-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`s-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="s-brand">
          <span className="s-brand-icon">⚡</span>
          <span className="s-brand-name">AnkiFlow</span>
          <span className="s-role-tag">Student</span>
        </div>

        {/* XP Summary in Sidebar */}
        <div className="s-xp-sidebar">
          <div className="s-level-circle">
            <span className="s-level-num">{level}</span>
          </div>
          <div className="s-xp-info">
            <div className="s-xp-total">{xp.total_xp} XP</div>
            <div className="s-xp-bar-mini">
              <div className="s-xp-bar-fill-mini" style={{ width: `${xpInLevel}%` }}></div>
            </div>
          </div>
          {xp.current_streak > 0 && (
            <div className="s-streak-mini">🔥 {xp.current_streak}</div>
          )}
        </div>

        <nav className="s-nav">
          <button className={`s-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => switchTab('dashboard')}>
            <ion-icon name="home-outline"></ion-icon>
            <span>Dashboard</span>
          </button>
          <button className={`s-nav-item ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => switchTab('assignments')}>
            <ion-icon name="document-text-outline"></ion-icon>
            <span>Assignments</span>
            {activeAssignments.length > 0 && <span className="s-nav-count">{activeAssignments.length}</span>}
          </button>
          <button className={`s-nav-item ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => switchTab('groups')}>
            <ion-icon name="people-outline"></ion-icon>
            <span>My Groups</span>
            {groups.length > 0 && <span className="s-nav-count">{groups.length}</span>}
          </button>
          <button className={`s-nav-item ${activeTab === 'statistics' ? 'active' : ''}`} onClick={() => switchTab('statistics')}>
            <ion-icon name="stats-chart-outline"></ion-icon>
            <span>Statistics</span>
          </button>
          <button className={`s-nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => switchTab('notifications')}>
            <ion-icon name="notifications-outline"></ion-icon>
            <span>Notifications</span>
            {unreadCount > 0 && <span className="s-nav-count s-nav-count-alert">{unreadCount}</span>}
          </button>
        </nav>

        <div className="s-nav-divider"></div>

        <nav className="s-nav">
          <a href="/app/study" className="s-nav-item">
            <ion-icon name="flash-outline"></ion-icon>
            <span>Study Cards</span>
          </a>
          <button className={`s-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => switchTab('settings')}>
            <ion-icon name="settings-outline"></ion-icon>
            <span>Settings</span>
          </button>
        </nav>

        <div className="s-sidebar-footer">
          <div className="s-user-info">
            <div className="s-user-avatar">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" />
              ) : (
                <span>{(user.user_metadata?.full_name || user.email || "S").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="s-user-details">
              <div className="s-user-name">{user.user_metadata?.full_name || user.email?.split("@")[0] || "Student"}</div>
              <div className="s-user-email">{user.email}</div>
            </div>
          </div>
          <button className="s-logout-btn" onClick={signOut} title="Sign out">
            <ion-icon name="log-out-outline"></ion-icon>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="s-main">
        {loadingData ? (
          <div className="s-loading-content">
            <div className="s-spinner" />
            <span>Loading your data...</span>
          </div>
        ) : (
          <>
            {/* DASHBOARD TAB */}
            {activeTab === "dashboard" && (
              <div className="s-content">
                <div className="s-page-header">
                  <h1>Welcome back, {user.user_metadata?.full_name || user.email?.split("@")[0] || "Student"} 👋</h1>
                  <p className="s-subtitle">Here&apos;s your learning overview</p>
                </div>

                {/* Stats */}
                <div className="s-stats-row">
                  <div className="s-stat-card">
                    <div className="s-stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                      <ion-icon name="document-text"></ion-icon>
                    </div>
                    <div>
                      <div className="s-stat-value">{activeAssignments.length}</div>
                      <div className="s-stat-label">Active Tasks</div>
                    </div>
                  </div>
                  <div className="s-stat-card">
                    <div className="s-stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                      <ion-icon name="checkmark-circle"></ion-icon>
                    </div>
                    <div>
                      <div className="s-stat-value">{completedAssignments.length}</div>
                      <div className="s-stat-label">Completed</div>
                    </div>
                  </div>
                  <div className="s-stat-card">
                    <div className="s-stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                      <ion-icon name="flash"></ion-icon>
                    </div>
                    <div>
                      <div className="s-stat-value">{xp.total_xp}</div>
                      <div className="s-stat-label">Total XP</div>
                    </div>
                  </div>
                  <div className="s-stat-card">
                    <div className="s-stat-icon" style={{ background: overdueAssignments.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)', color: overdueAssignments.length > 0 ? '#EF4444' : '#6B7280' }}>
                      <ion-icon name="time"></ion-icon>
                    </div>
                    <div>
                      <div className="s-stat-value">{overdueAssignments.length}</div>
                      <div className="s-stat-label">Overdue</div>
                    </div>
                  </div>
                </div>

                {/* Overdue Warning */}
                {overdueAssignments.length > 0 && (
                  <div className="s-alert s-alert-error">
                    <ion-icon name="warning"></ion-icon>
                    <span>You have {overdueAssignments.length} overdue assignment{overdueAssignments.length > 1 ? 's' : ''}! Complete them as soon as possible.</span>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="s-section">
                  <h2 className="s-section-title">Quick Actions</h2>
                  <div className="s-quick-actions">
                    <a href="/app/study" className="s-quick-action">
                      <ion-icon name="flash-outline"></ion-icon>
                      <span>Study Cards</span>
                    </a>
                    <button className="s-quick-action" onClick={() => setActiveTab("assignments")}>
                      <ion-icon name="document-text-outline"></ion-icon>
                      <span>View Assignments</span>
                    </button>
                    <button className="s-quick-action" onClick={() => setActiveTab("groups")}>
                      <ion-icon name="people-outline"></ion-icon>
                      <span>Join a Group</span>
                    </button>
                  </div>
                </div>

                {/* Active Assignments */}
                {activeAssignments.length > 0 && (
                  <div className="s-section">
                    <div className="s-section-header">
                      <h2 className="s-section-title">Current Assignments</h2>
                      <button className="s-link-btn" onClick={() => setActiveTab("assignments")}>View All →</button>
                    </div>
                    <div className="s-assign-list">
                      {activeAssignments.slice(0, 4).map(a => {
                        const prog = a.my_progress;
                        const pct = prog ? Math.min(100, Math.round((prog.cards_mastered / Math.max(prog.cards_studied || 1, 1)) * 100)) : 0;
                        const isOverdue = a.deadline && new Date(a.deadline) < new Date();
                        return (
                          <div key={a.id} className={`s-assign-card ${isOverdue ? 'overdue' : ''}`}>
                            <div className="s-assign-top">
                              <div>
                                <div className="s-assign-title">{a.title}</div>
                                <div className="s-assign-meta">
                                  {a.group_name && <span className="s-group-chip" style={{ background: a.group_color || '#6366F1' }}>{a.group_name}</span>}
                                  {a.deadline && (
                                    <span className={`s-deadline ${isOverdue ? 'overdue' : ''}`}>
                                      <ion-icon name="time-outline"></ion-icon>
                                      {isOverdue ? 'Overdue' : new Date(a.deadline).toLocaleDateString()}
                                    </span>
                                  )}
                                  <span className="s-xp-tag">⚡ {a.xp_reward} XP</span>
                                </div>
                              </div>
                              <a href="/app/study" className="s-btn s-btn-primary s-btn-sm">
                                <ion-icon name="play"></ion-icon> Study
                              </a>
                            </div>
                            {prog && (
                              <div className="s-assign-progress">
                                <div className="s-progress-info">
                                  <span>{prog.cards_studied} cards studied</span>
                                  <span>{prog.accuracy ? Math.round(prog.accuracy) : 0}% accuracy</span>
                                </div>
                                <div className="s-progress-bar">
                                  <div className="s-progress-fill" style={{ width: `${pct}%` }}></div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {assignments.length === 0 && groups.length === 0 && (
                  <div className="s-empty-state">
                    <div className="s-empty-icon">🎓</div>
                    <h3>Welcome to AnkiFlow!</h3>
                    <p>Join a group with a code from your teacher to get started with assignments.</p>
                    <button className="s-btn s-btn-primary" onClick={() => setActiveTab("groups")}>
                      <ion-icon name="people-outline"></ion-icon>
                      Join a Group
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ASSIGNMENTS TAB */}
            {activeTab === "assignments" && (
              <div className="s-content">
                <div className="s-page-header">
                  <h1>My Assignments</h1>
                  <p className="s-subtitle">{assignments.length} total · {activeAssignments.length} active · {completedAssignments.length} completed</p>
                </div>

                {assignments.length === 0 ? (
                  <div className="s-empty-state">
                    <div className="s-empty-icon">📋</div>
                    <h3>No assignments yet</h3>
                    <p>Join a group to receive assignments from your teacher.</p>
                    <button className="s-btn s-btn-primary" onClick={() => setActiveTab("groups")}>Join a Group</button>
                  </div>
                ) : (
                  <>
                    {overdueAssignments.length > 0 && (
                      <div className="s-section">
                        <h2 className="s-section-title" style={{ color: '#f87171' }}>⚠️ Overdue ({overdueAssignments.length})</h2>
                        <div className="s-assign-list">
                          {overdueAssignments.map(a => <AssignmentCard key={a.id} a={a} />)}
                        </div>
                      </div>
                    )}
                    {activeAssignments.filter(a => !overdueAssignments.includes(a)).length > 0 && (
                      <div className="s-section">
                        <h2 className="s-section-title">📝 To Do ({activeAssignments.filter(a => !overdueAssignments.includes(a)).length})</h2>
                        <div className="s-assign-list">
                          {activeAssignments.filter(a => !overdueAssignments.includes(a)).map(a => <AssignmentCard key={a.id} a={a} />)}
                        </div>
                      </div>
                    )}
                    {completedAssignments.length > 0 && (
                      <div className="s-section">
                        <h2 className="s-section-title">✅ Completed ({completedAssignments.length})</h2>
                        <div className="s-assign-list">
                          {completedAssignments.map(a => <AssignmentCard key={a.id} a={a} />)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* GROUPS TAB */}
            {activeTab === "groups" && (
              <div className="s-content">
                <div className="s-page-header">
                  <h1>My Groups</h1>
                  <p className="s-subtitle">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Join Group Form */}
                <div className="s-join-card">
                  <h3>Join a Group</h3>
                  <p className="s-join-desc">Enter the join code from your teacher</p>
                  <form onSubmit={handleJoinGroup} className="s-join-form">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g. ABC123)"
                      maxLength={10}
                      className="s-join-input"
                    />
                    <button type="submit" className="s-btn s-btn-primary" disabled={joiningGroup || !joinCode.trim()}>
                      {joiningGroup ? "Joining..." : "Join"}
                    </button>
                  </form>
                  {joinError && <div className="s-join-msg s-join-error">{joinError}</div>}
                  {joinSuccess && <div className="s-join-msg s-join-success">{joinSuccess}</div>}
                </div>

                {groups.length > 0 && (
                  <div className="s-card-grid">
                    {groups.map(g => (
                      <div key={g.id} className="s-group-card" style={{ borderTopColor: g.color }}>
                        <div className="s-group-header">
                          <div className="s-group-dot" style={{ background: g.color }}></div>
                          <h3>{g.name}</h3>
                        </div>
                        {g.description && <p className="s-group-desc">{g.description}</p>}
                        <div className="s-group-stats">
                          <span><ion-icon name="people-outline"></ion-icon> {g.member_count} members</span>
                          <span><ion-icon name="document-text-outline"></ion-icon> {g.assignment_count} tasks</span>
                        </div>
                        <div className="s-group-joined">Joined {new Date(g.joined_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PROGRESS TAB */}
            {activeTab === "statistics" && (
              <div className="s-content">
                <div className="s-page-header">
                  <h1>Statistics</h1>
                  <p className="s-subtitle">Your learning analytics</p>
                </div>

                {/* Level & XP Card */}
                <div className="s-level-card">
                  <div className="s-level-circle-lg">
                    <span className="s-level-num-lg">{level}</span>
                    <span className="s-level-label">LEVEL</span>
                  </div>
                  <div className="s-level-details">
                    <h2>{xp.total_xp} XP Total</h2>
                    <div className="s-xp-bar-lg-wrap">
                      <div className="s-xp-bar-lg">
                        <div className="s-xp-bar-fill-lg" style={{ width: `${xpInLevel}%` }}></div>
                      </div>
                      <span className="s-xp-bar-label">{xpInLevel}/100 to Level {level + 1}</span>
                    </div>
                  </div>
                </div>

                {/* Key Stats Grid */}
                <div className="s-stats-grid-4">
                  <div className="s-stat-card-mini">
                    <div className="s-stat-icon" style={{ background: '#3B82F620', color: '#3B82F6' }}>📊</div>
                    <div className="s-stat-value-sm">{assignments.length}</div>
                    <div className="s-stat-label-sm">Total Tasks</div>
                  </div>
                  <div className="s-stat-card-mini">
                    <div className="s-stat-icon" style={{ background: '#10B98120', color: '#10B981' }}>✅</div>
                    <div className="s-stat-value-sm">{completedAssignments.length}</div>
                    <div className="s-stat-label-sm">Completed</div>
                  </div>
                  <div className="s-stat-card-mini">
                    <div className="s-stat-icon" style={{ background: '#F59E0B20', color: '#F59E0B' }}>🔥</div>
                    <div className="s-stat-value-sm">{xp.current_streak}</div>
                    <div className="s-stat-label-sm">Day Streak</div>
                  </div>
                  <div className="s-stat-card-mini">
                    <div className="s-stat-icon" style={{ background: '#8B5CF620', color: '#8B5CF6' }}>🏆</div>
                    <div className="s-stat-value-sm">{xp.longest_streak}</div>
                    <div className="s-stat-label-sm">Best Streak</div>
                  </div>
                </div>

                {/* Assignment Completion Chart */}
                <div className="s-chart-card">
                  <h3 className="s-chart-title">Assignment Progress</h3>
                  {assignments.length === 0 ? (
                    <div className="s-chart-empty">No assignments yet</div>
                  ) : (
                    <div className="s-bar-chart">
                      {(() => {
                        const completed = completedAssignments.length;
                        const inProgress = assignments.filter(a => a.my_progress?.status === "in_progress").length;
                        const notStarted = assignments.filter(a => !a.my_progress || a.my_progress.status === "pending" || a.my_progress.status === "not_started").length;
                        const overdue = overdueAssignments.length;
                        const total = assignments.length || 1;
                        return (
                          <>
                            <div className="s-bar-row">
                              <span className="s-bar-label">Completed</span>
                              <div className="s-bar-track">
                                <div className="s-bar-fill" style={{ width: `${(completed / total) * 100}%`, background: '#10B981' }}></div>
                              </div>
                              <span className="s-bar-value">{completed}</span>
                            </div>
                            <div className="s-bar-row">
                              <span className="s-bar-label">In Progress</span>
                              <div className="s-bar-track">
                                <div className="s-bar-fill" style={{ width: `${(inProgress / total) * 100}%`, background: '#3B82F6' }}></div>
                              </div>
                              <span className="s-bar-value">{inProgress}</span>
                            </div>
                            <div className="s-bar-row">
                              <span className="s-bar-label">Not Started</span>
                              <div className="s-bar-track">
                                <div className="s-bar-fill" style={{ width: `${(notStarted / total) * 100}%`, background: '#6B7280' }}></div>
                              </div>
                              <span className="s-bar-value">{notStarted}</span>
                            </div>
                            {overdue > 0 && (
                              <div className="s-bar-row">
                                <span className="s-bar-label">Overdue</span>
                                <div className="s-bar-track">
                                  <div className="s-bar-fill" style={{ width: `${(overdue / total) * 100}%`, background: '#EF4444' }}></div>
                                </div>
                                <span className="s-bar-value">{overdue}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Per-Assignment Accuracy Chart */}
                {assignments.filter(a => a.my_progress && a.my_progress.total_reviews > 0).length > 0 && (
                  <div className="s-chart-card">
                    <h3 className="s-chart-title">Accuracy by Assignment</h3>
                    <div className="s-bar-chart">
                      {assignments
                        .filter(a => a.my_progress && a.my_progress.total_reviews > 0)
                        .slice(0, 8)
                        .map(a => {
                          const acc = Math.round(a.my_progress?.accuracy || 0);
                          const color = acc >= 80 ? '#10B981' : acc >= 60 ? '#F59E0B' : '#EF4444';
                          return (
                            <div className="s-bar-row" key={a.id}>
                              <span className="s-bar-label" title={a.title}>{a.title.length > 16 ? a.title.slice(0, 16) + '…' : a.title}</span>
                              <div className="s-bar-track">
                                <div className="s-bar-fill" style={{ width: `${acc}%`, background: color }}></div>
                              </div>
                              <span className="s-bar-value">{acc}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Groups Activity */}
                {groups.length > 0 && (
                  <div className="s-chart-card">
                    <h3 className="s-chart-title">Groups</h3>
                    <div className="s-groups-stats">
                      {groups.map(g => (
                        <div key={g.id} className="s-group-stat-row">
                          <span className="s-group-dot" style={{ background: g.color }}></span>
                          <span className="s-group-stat-name">{g.name}</span>
                          <span className="s-group-stat-meta">{g.member_count} members · {g.assignment_count} tasks</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* XP History */}
                {xp.recent_events && xp.recent_events.length > 0 && (
                  <div className="s-chart-card">
                    <h3 className="s-chart-title">Recent XP Activity</h3>
                    <div className="s-activity-list">
                      {xp.recent_events.slice(0, 10).map((ev, i) => (
                        <div key={i} className="s-activity-item">
                          <span className="s-activity-type">{ev.event_type.replace(/_/g, ' ')}</span>
                          <span className="s-activity-xp">+{ev.xp_amount} XP</span>
                          <span className="s-activity-time">{new Date(ev.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* How to Earn */}
                <div className="s-chart-card">
                  <h3 className="s-chart-title">How to Earn XP</h3>
                  <div className="s-earn-grid">
                    <div className="s-earn-item">
                      <span className="s-earn-icon">📖</span>
                      <div><strong>Review Cards</strong><span>+5 XP per session</span></div>
                    </div>
                    <div className="s-earn-item">
                      <span className="s-earn-icon">✅</span>
                      <div><strong>Complete Task</strong><span>+50 XP (varies)</span></div>
                    </div>
                    <div className="s-earn-item">
                      <span className="s-earn-icon">🔥</span>
                      <div><strong>Daily Streak</strong><span>+10 XP per day</span></div>
                    </div>
                    <div className="s-earn-item">
                      <span className="s-earn-icon">🏆</span>
                      <div><strong>Perfect Score</strong><span>+20 XP bonus</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <div className="s-content">
                <div className="s-page-header">
                  <div>
                    <h1>Notifications</h1>
                    <p className="s-subtitle">{unreadCount} unread</p>
                  </div>
                  {unreadCount > 0 && (
                    <button className="s-btn s-btn-outline" onClick={markAllRead}>Mark All Read</button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="s-empty-state">
                    <div className="s-empty-icon">🔔</div>
                    <h3>No notifications</h3>
                    <p>You&apos;ll see updates from your teachers and groups here.</p>
                  </div>
                ) : (
                  <div className="s-notif-list">
                    {notifications.map(n => (
                      <div key={n.id} className={`s-notif-item ${!n.read ? 'unread' : ''}`}>
                        <div className="s-notif-icon">
                          {n.type === 'assignment_new' ? '📝' : n.type === 'assignment_graded' ? '⭐' : n.type === 'xp_earned' ? '⚡' : n.type === 'group_joined' ? '👥' : '🔔'}
                        </div>
                        <div className="s-notif-body">
                          <div className="s-notif-title">{n.title}</div>
                          <div className="s-notif-msg">{n.message}</div>
                          <div className="s-notif-time">{new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        {!n.read && <div className="s-notif-dot"></div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="s-content">
                <div className="s-page-header">
                  <h1>Settings</h1>
                  <p className="s-subtitle">Manage your account and preferences</p>
                </div>

                {/* Account */}
                <div className="s-section">
                  <h2 className="s-section-title">Account</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-account">
                      <div className="s-user-avatar" style={{ width: 48, height: 48, fontSize: 20 }}>
                        {user.user_metadata?.avatar_url ? (
                          <img src={user.user_metadata.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span>{(user.user_metadata?.full_name || user.email || "S").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="t-settings-account-name">{user.user_metadata?.full_name || user.email?.split("@")[0]}</div>
                        <div className="t-settings-account-email">{user.email}</div>
                        <div className="t-settings-account-role">Role: {role?.toUpperCase()}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <button className="s-btn s-btn-danger" onClick={signOut}>
                        <ion-icon name="log-out-outline"></ion-icon>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>

                {/* Study Preferences */}
                <div className="s-section">
                  <h2 className="s-section-title">Study Preferences</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Daily Goal</div>
                        <div className="t-settings-sublabel">Cards to study per day</div>
                      </div>
                      <input type="number" className="t-settings-input" defaultValue={20} min={5} max={200} />
                    </div>
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">New Cards / Day</div>
                        <div className="t-settings-sublabel">Max new cards introduced</div>
                      </div>
                      <input type="number" className="t-settings-input" defaultValue={20} min={0} max={100} />
                    </div>
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Max Reviews / Day</div>
                        <div className="t-settings-sublabel">Max reviews per session</div>
                      </div>
                      <input type="number" className="t-settings-input" defaultValue={100} min={10} max={500} />
                    </div>
                  </div>
                </div>

                {/* Appearance */}
                <div className="s-section">
                  <h2 className="s-section-title">Appearance</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Theme</div>
                        <div className="t-settings-sublabel">Light or dark mode</div>
                      </div>
                      <button className="s-btn s-btn-outline" onClick={() => {
                        if (typeof window !== "undefined" && (window as any).toggleTheme) {
                          (window as any).toggleTheme();
                        }
                      }}>
                        <ion-icon name="sunny-outline"></ion-icon>
                        Toggle
                      </button>
                    </div>
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Card Font Size</div>
                        <div className="t-settings-sublabel">Adjust flashcard text</div>
                      </div>
                      <input type="range" defaultValue={32} min={16} max={64} style={{ width: 120 }} onChange={e => {
                        document.documentElement.style.setProperty('--card-font-size', e.target.value + 'px');
                      }} />
                    </div>
                  </div>
                </div>

                {/* Audio & TTS */}
                <div className="s-section">
                  <h2 className="s-section-title">Audio & TTS</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Text-to-Speech</div>
                        <div className="t-settings-sublabel">Auto-read cards aloud</div>
                      </div>
                      <label className="t-toggle"><input type="checkbox" defaultChecked /><span className="t-toggle-slider"></span></label>
                    </div>
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Sound Effects</div>
                        <div className="t-settings-sublabel">Sounds on correct/wrong</div>
                      </div>
                      <label className="t-toggle"><input type="checkbox" /><span className="t-toggle-slider"></span></label>
                    </div>
                  </div>
                </div>

                {/* Algorithm */}
                <div className="s-section">
                  <h2 className="s-section-title">Algorithm</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Spaced Repetition</div>
                        <div className="t-settings-sublabel">SM-2 or FSRS algorithm</div>
                      </div>
                      <select className="t-settings-select" defaultValue="sm-2">
                        <option value="sm-2">SM-2 (Classic)</option>
                        <option value="fsrs">FSRS (Modern)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Data */}
                <div className="s-section">
                  <h2 className="s-section-title">Data Management</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Export data</div>
                        <div className="t-settings-sublabel">Download decks as JSON</div>
                      </div>
                      <a href="/api/backup/export" className="s-btn s-btn-outline s-btn-sm">
                        <ion-icon name="download-outline"></ion-icon> Export
                      </a>
                    </div>
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Import data</div>
                        <div className="t-settings-sublabel">Restore from backup</div>
                      </div>
                      <a href="/app" className="s-btn s-btn-outline s-btn-sm">
                        <ion-icon name="cloud-upload-outline"></ion-icon> Import
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="s-bottom-nav">
        <button className={`s-bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => switchTab('dashboard')}>
          <ion-icon name="home-outline"></ion-icon>
          <span>Home</span>
        </button>
        <button className={`s-bottom-nav-item ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => switchTab('assignments')}>
          <ion-icon name="document-text-outline"></ion-icon>
          <span>Tasks</span>
        </button>
        <button className={`s-bottom-nav-item ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => switchTab('groups')}>
          <ion-icon name="people-outline"></ion-icon>
          <span>Groups</span>
        </button>
        <button className={`s-bottom-nav-item ${activeTab === 'statistics' ? 'active' : ''}`} onClick={() => switchTab('statistics')}>
          <ion-icon name="stats-chart-outline"></ion-icon>
          <span>Stats</span>
        </button>
        <button className={`s-bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => switchTab('settings')}>
          <ion-icon name="settings-outline"></ion-icon>
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}

function AssignmentCard({ a }: { a: Assignment }) {
  const prog = a.my_progress;
  const pct = prog ? Math.min(100, Math.round(((prog.cards_mastered || 0) / Math.max(prog.cards_studied || 1, 1)) * 100)) : 0;
  const isOverdue = a.deadline && new Date(a.deadline) < new Date();
  const isCompleted = prog?.status === "completed";

  return (
    <div className={`s-assign-card ${isOverdue && !isCompleted ? 'overdue' : ''} ${isCompleted ? 'completed' : ''}`}>
      <div className="s-assign-top">
        <div>
          <div className="s-assign-title">{a.title}</div>
          {a.description && <div className="s-assign-desc">{a.description}</div>}
          <div className="s-assign-meta">
            {a.group_name && <span className="s-group-chip" style={{ background: a.group_color || '#6366F1' }}>{a.group_name}</span>}
            {a.deadline && (
              <span className={`s-deadline ${isOverdue && !isCompleted ? 'overdue' : ''}`}>
                <ion-icon name="time-outline"></ion-icon>
                {new Date(a.deadline).toLocaleDateString()}
              </span>
            )}
            <span className="s-xp-tag">⚡ {a.xp_reward} XP</span>
            <span className={`s-status ${prog?.status || 'not_started'}`}>{isCompleted ? '✅ Done' : prog?.status === 'in_progress' ? '🔄 In Progress' : '⬜ Not Started'}</span>
          </div>
        </div>
        {!isCompleted && (
          <a href="/app/study" className="s-btn s-btn-primary s-btn-sm">
            <ion-icon name="play"></ion-icon> Study
          </a>
        )}
      </div>
      {prog && (prog.cards_studied > 0 || isCompleted) && (
        <div className="s-assign-progress">
          <div className="s-progress-info">
            <span>{prog.cards_studied} studied · {prog.cards_mastered} mastered</span>
            <span>{prog.accuracy ? Math.round(prog.accuracy) : 0}% accuracy</span>
          </div>
          <div className="s-progress-bar">
            <div className="s-progress-fill" style={{ width: `${isCompleted ? 100 : pct}%`, background: isCompleted ? '#10B981' : undefined }}></div>
          </div>
          <div className="s-progress-extra">
            <span>{prog.total_reviews} reviews</span>
            {prog.time_spent_minutes > 0 && <span>{prog.time_spent_minutes}min spent</span>}
            {prog.xp_earned > 0 && <span>⚡ {prog.xp_earned} XP earned</span>}
          </div>
        </div>
      )}
    </div>
  );
}
