"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function StudentPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f14', color: '#fff' }}><div className="s-spinner" /></div>}>
      <StudentDashboard />
    </Suspense>
  );
}

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
    cards_total: number;
    accuracy: number;
    total_reviews: number;
    time_spent_seconds: number;
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
  is_owner?: boolean;
  owner_id?: string;
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
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

function StudentDashboard() {
  const { user, loading, role, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"dashboard" | "assignments" | "groups" | "inbox" | "profile" | "settings">("dashboard");
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Profile state
  const [profileData, setProfileData] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Settings state (persisted to localStorage)
  const [settings, setSettings] = useState({
    dailyGoal: 20, newCardsPerDay: 20, maxReviews: 100,
    cardFontSize: 32, tts: true, soundEffects: false, algorithm: 'sm-2'
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ankiflow-student-settings');
      if (saved) setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem('ankiflow-student-settings', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Inbox / connections state
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [myConnections, setMyConnections] = useState<any[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  // Modern toast/modal state (replaces native alert/confirm)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void; onCancel?: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm });
  };

  const handleCompleteAssignment = async (assignmentId: string, title: string) => {
    showConfirm(`Mark "${title}" as completed? You'll earn XP for this!`, async () => {
      await doCompleteAssignment(assignmentId);
    });
  };

  const doCompleteAssignment = async (assignmentId: string) => {
    setCompletingId(assignmentId);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete");
      
      // Update local state
      setAssignments(prev =>
        prev.map(a =>
          a.id === assignmentId
            ? { ...a, my_progress: { ...(a.my_progress || { cards_studied: 0, cards_mastered: 0, cards_total: 0, accuracy: 0, total_reviews: 0, time_spent_seconds: 0, xp_earned: 0 }), status: "completed", xp_earned: data.xp_awarded || 0 } }
            : a
        )
      );

      // Refresh XP data
      const xRes = await fetch("/api/xp").catch(() => null);
      if (xRes?.ok) {
        const d = await xRes.json();
        setXP(d);
      }

      showToast(`Assignment completed! +${data.xp_awarded || 0} XP earned!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setCompletingId(null);
    }
  };

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

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    showConfirm(`Are you sure you want to leave "${groupName}"? You will lose access to assignments in this group.`, async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/members/${user?.id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to leave group");
        }
        setGroups(prev => prev.filter(g => g.id !== groupId));
        showToast(`Left "${groupName}"`, 'info');
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    });
  };

  const markAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch {}
  };

  const markOneRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {}
  };

  const fetchInbox = useCallback(async () => {
    setInboxLoading(true);
    try {
      const res = await fetch("/api/connections").catch(() => null);
      if (res?.ok) {
        const d = await res.json();
        setPendingRequests(d.pending_requests || []);
        setMyConnections(d.connections || []);
      }
    } catch {} finally {
      setInboxLoading(false);
    }
  }, []);

  const handleAcceptReject = async (connectionId: string, action: "accept" | "reject") => {
    try {
      const res = await fetch("/api/connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId, action }),
      });
      if (!res.ok) throw new Error("Failed");
      fetchInbox();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfileData(data.profile);
        setEditName(data.profile.display_name || "");
        setEditBio(data.profile.bio || "");
        setEditAvatar(data.profile.avatar_url || "");
        setEditNickname(data.profile.username || data.profile.nickname || "");
        setEditPhone(data.profile.phone || "");
      }
    } catch {}
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: editName,
          bio: editBio,
          avatar_url: editAvatar,
          username: editNickname,
          nickname: editNickname,
          phone: editPhone,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      showToast("Profile updated!", 'success');
      fetchProfile();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    if (activeTab === "profile" && !profileData) fetchProfile();
    if (activeTab === "inbox") fetchInbox();
  }, [activeTab]);

  // Read query params on mount
  useEffect(() => {
    const tab = searchParams.get("tab");
    const validTabs = ["dashboard", "assignments", "groups", "inbox", "profile", "settings"];
    if (tab && validTabs.includes(tab)) setActiveTab(tab as any);
  }, [searchParams]);

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
        <ion-icon name="flash" className="s-brand-icon"></ion-icon>
        <span className="s-brand-name">AnkiFlow</span>
        <span className="s-role-tag">Student</span>
      </div>
      
      {/* Mobile Overlay */}
      <div className={`s-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`s-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="s-brand">
          <button className="s-sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title="Toggle sidebar">
            <ion-icon name={sidebarCollapsed ? 'chevron-forward-outline' : 'chevron-back-outline'}></ion-icon>
          </button>
          <ion-icon name="flash" className="s-brand-icon"></ion-icon>
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
            <div className="s-streak-mini"><ion-icon name="flame"></ion-icon> {xp.current_streak}</div>
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
          <button className={`s-nav-item ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => switchTab('inbox')}>
            <ion-icon name="mail-outline"></ion-icon>
            <span>Inbox</span>
            {(unreadCount + pendingRequests.length) > 0 && <span className="s-nav-count s-nav-count-alert">{unreadCount + pendingRequests.length}</span>}
          </button>
        </nav>

        <div className="s-nav-divider"></div>

        <nav className="s-nav">
          <a href="/app/study" className="s-nav-item">
            <ion-icon name="flash-outline"></ion-icon>
            <span>Flashcards</span>
          </a>
          <button className={`s-nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => switchTab('profile')}>
            <ion-icon name="person-outline"></ion-icon>
            <span>My Profile</span>
          </button>
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
                  <h1>Welcome back, {user.user_metadata?.full_name || user.email?.split("@")[0] || "Student"}</h1>
                  <p className="s-subtitle">Here&apos;s your learning overview</p>
                </div>

                {/* Stats */}
                <div className="s-stats-row">
                  <div className="s-stat-card">
                    <div className="s-stat-icon" style={{ background: 'rgba(124,92,252,0.1)', color: '#7C5CFC' }}>
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
                      <span>Flashcards</span>
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
                                  {a.group_name && <span className="s-group-chip" style={{ background: a.group_color || '#7C5CFC' }}>{a.group_name}</span>}
                                  {a.deadline && (
                                    <span className={`s-deadline ${isOverdue ? 'overdue' : ''}`}>
                                      <ion-icon name="time-outline"></ion-icon>
                                      {isOverdue ? 'Overdue' : new Date(a.deadline).toLocaleDateString()}
                                    </span>
                                  )}
                                  <span className="s-xp-tag"><ion-icon name="flash" style={{ fontSize: 12 }}></ion-icon> {a.xp_reward} XP</span>
                                </div>
                              </div>
                              <div className="s-assign-actions">
                                <a href={`/student/study/${a.id}`} className="s-btn s-btn-primary s-btn-sm">
                                  <ion-icon name="play"></ion-icon> Study
                                </a>
                                {prog?.status === 'in_progress' && (
                                  <button
                                    className="s-btn s-btn-success s-btn-sm"
                                    onClick={() => handleCompleteAssignment(a.id, a.title)}
                                    disabled={completingId === a.id}
                                  >
                                    {completingId === a.id ? '...' : <><ion-icon name="checkmark-done"></ion-icon> Complete</>}
                                  </button>
                                )}
                              </div>
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
                    <div className="s-empty-icon"><ion-icon name="school-outline" style={{ fontSize: 48 }}></ion-icon></div>
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
                    <div className="s-empty-icon"><ion-icon name="clipboard-outline" style={{ fontSize: 48 }}></ion-icon></div>
                    <h3>No assignments yet</h3>
                    <p>Your assignments from teachers will appear here once you join a group.</p>
                  </div>
                ) : (
                  <>
                    {overdueAssignments.length > 0 && (
                      <div className="s-section">
                        <h2 className="s-section-title" style={{ color: '#f87171' }}><ion-icon name="alert-circle" style={{ marginRight: 6, verticalAlign: 'middle' }}></ion-icon>Overdue ({overdueAssignments.length})</h2>
                        <div className="s-assign-list">
                          {overdueAssignments.map(a => <AssignmentCard key={a.id} a={a} onComplete={handleCompleteAssignment} completingId={completingId} />)}
                        </div>
                      </div>
                    )}
                    {activeAssignments.filter(a => !overdueAssignments.includes(a)).length > 0 && (
                      <div className="s-section">
                        <h2 className="s-section-title"><ion-icon name="list-outline" style={{ marginRight: 6, verticalAlign: 'middle' }}></ion-icon>To Do ({activeAssignments.filter(a => !overdueAssignments.includes(a)).length})</h2>
                        <div className="s-assign-list">
                          {activeAssignments.filter(a => !overdueAssignments.includes(a)).map(a => <AssignmentCard key={a.id} a={a} onComplete={handleCompleteAssignment} completingId={completingId} />)}
                        </div>
                      </div>
                    )}
                    {completedAssignments.length > 0 && (
                      <div className="s-section">
                        <h2 className="s-section-title"><ion-icon name="checkmark-done" style={{ marginRight: 6, verticalAlign: 'middle', color: '#10B981' }}></ion-icon>Completed ({completedAssignments.length})</h2>
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
                  <p className="s-join-desc">Use an invite link from your teacher, or enter the code manually</p>
                  <form onSubmit={handleJoinGroup} className="s-join-form">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Paste invite code"
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
                      <Link key={g.id} href={`/groups/${g.id}`} className="s-group-card" style={{ borderTopColor: g.color, textDecoration: 'none', color: 'inherit' }}>
                        <div className="s-group-header">
                          <div className="s-group-dot" style={{ background: g.color }}></div>
                          <h3>{g.name}</h3>
                        </div>
                        {g.description && <p className="s-group-desc">{g.description}</p>}
                        <div className="s-group-stats">
                          <span><ion-icon name="people-outline"></ion-icon> {g.member_count} members</span>
                          <span><ion-icon name="document-text-outline"></ion-icon> {g.assignment_count} tasks</span>
                        </div>
                        <div className="s-group-footer">
                          <span className="s-group-joined">Joined {new Date(g.joined_at).toLocaleDateString()}</span>
                          {!g.is_owner && (
                            <button
                              className="s-btn s-btn-danger s-btn-sm"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLeaveGroup(g.id, g.name); }}
                              title="Leave this group"
                            >
                              <ion-icon name="exit-outline"></ion-icon> Leave
                            </button>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PROFILE TAB — View Only + Full Statistics */}
            {activeTab === "profile" && (
              <div className="s-content">
                <div className="s-page-header">
                  <h1>My Profile</h1>
                  <p className="s-subtitle">Your profile &amp; learning analytics</p>
                </div>

                <div className="s-profile-card">
                  <div className="s-profile-header">
                    <div className="s-profile-avatar-lg">
                      {editAvatar ? (
                        <img src={editAvatar} alt="Avatar" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <span>{(editName || user?.email || "S").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="s-profile-header-info">
                      <h2>{editName || user?.email?.split("@")[0]}</h2>
                      <p className="s-profile-role">STUDENT · Level {level}</p>
                      {editNickname && <p className="s-profile-username">@{editNickname}</p>}
                      <div className="s-profile-badges">
                        <span className="s-profile-badge"><ion-icon name="flash" style={{ color: '#F59E0B' }}></ion-icon> {xp.total_xp} XP</span>
                        {xp.current_streak > 0 && <span className="s-profile-badge"><ion-icon name="flame" style={{ color: '#EF4444' }}></ion-icon> {xp.current_streak} day streak</span>}
                        <span className="s-profile-badge"><ion-icon name="checkmark-circle" style={{ color: '#10B981' }}></ion-icon> {completedAssignments.length} completed</span>
                      </div>
                    </div>
                  </div>

                  {/* View-only info */}
                  <div className="s-profile-details">
                    {editBio && (
                      <div className="s-profile-detail-row">
                        <span className="s-profile-detail-label">Bio</span>
                        <p className="s-profile-detail-value">{editBio}</p>
                      </div>
                    )}
                    <div className="s-profile-detail-row">
                      <span className="s-profile-detail-label">Email</span>
                      <p className="s-profile-detail-value">{profileData?.email || user?.email || "—"}</p>
                    </div>
                    {editPhone && (
                      <div className="s-profile-detail-row">
                        <span className="s-profile-detail-label">Phone</span>
                        <p className="s-profile-detail-value">{editPhone}</p>
                      </div>
                    )}
                    {editNickname && (
                      <div className="s-profile-detail-row">
                        <span className="s-profile-detail-label">Profile URL</span>
                        <p className="s-profile-detail-value">
                          <a href={`/profile/${editNickname}`} style={{ color: '#7C5CFC', textDecoration: 'none' }}>anki.sodops.uz/profile/{editNickname}</a>
                        </p>
                      </div>
                    )}
                  </div>

                  <button className="s-btn s-btn-outline" onClick={() => setActiveTab("settings")} style={{ marginTop: 16 }}>
                    <ion-icon name="settings-outline"></ion-icon> Edit Profile in Settings
                  </button>
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
                    {xp.today_xp > 0 && <span className="s-today-xp">+{xp.today_xp} XP today</span>}
                  </div>
                </div>

                {/* Key Stats Grid */}
                <div className="s-stats-grid-4">
                  <div className="s-stat-card-mini">
                    <div className="s-stat-icon" style={{ background: '#3B82F620', color: '#3B82F6' }}><ion-icon name="bar-chart"></ion-icon></div>
                    <div className="s-stat-value-sm">{assignments.length}</div>
                    <div className="s-stat-label-sm">Total Tasks</div>
                  </div>
                  <div className="s-stat-card-mini">
                    <div className="s-stat-icon" style={{ background: '#10B98120', color: '#10B981' }}><ion-icon name="checkmark-done"></ion-icon></div>
                    <div className="s-stat-value-sm">{completedAssignments.length}</div>
                    <div className="s-stat-label-sm">Completed</div>
                  </div>
                  <div className="s-stat-card-mini">
                    <div className="s-stat-icon" style={{ background: '#F59E0B20', color: '#F59E0B' }}><ion-icon name="flame"></ion-icon></div>
                    <div className="s-stat-value-sm">{xp.current_streak}</div>
                    <div className="s-stat-label-sm">Day Streak</div>
                  </div>
                  <div className="s-stat-card-mini">
                    <div className="s-stat-icon" style={{ background: '#9B7FFF20', color: '#9B7FFF' }}><ion-icon name="trophy"></ion-icon></div>
                    <div className="s-stat-value-sm">{xp.longest_streak}</div>
                    <div className="s-stat-label-sm">Best Streak</div>
                  </div>
                </div>

                {/* Study Summary */}
                {assignments.length > 0 && (
                  <div className="s-chart-card">
                    <h3 className="s-chart-title"><ion-icon name="trending-up" style={{ marginRight: 6, verticalAlign: 'middle' }}></ion-icon>Study Summary</h3>
                    {(() => {
                      const totalReviews = assignments.reduce((s, a) => s + (a.my_progress?.total_reviews || 0), 0);
                      const totalCards = assignments.reduce((s, a) => s + (a.my_progress?.cards_studied || 0), 0);
                      const totalMastered = assignments.reduce((s, a) => s + (a.my_progress?.cards_mastered || 0), 0);
                      const totalMinutes = Math.round(assignments.reduce((s, a) => s + (a.my_progress?.time_spent_seconds || 0), 0) / 60);
                      const avgAccuracy = assignments.filter(a => a.my_progress && a.my_progress.total_reviews > 0).length > 0
                        ? Math.round(assignments.filter(a => a.my_progress && a.my_progress.total_reviews > 0).reduce((s, a) => s + (a.my_progress?.accuracy || 0), 0) / assignments.filter(a => a.my_progress && a.my_progress.total_reviews > 0).length)
                        : 0;
                      const completionRate = assignments.length > 0 ? Math.round((completedAssignments.length / assignments.length) * 100) : 0;

                      return (
                        <div className="s-summary-grid">
                          <div className="s-summary-item">
                            <span className="s-summary-val">{totalReviews}</span>
                            <span className="s-summary-label">Total Reviews</span>
                          </div>
                          <div className="s-summary-item">
                            <span className="s-summary-val">{totalCards}</span>
                            <span className="s-summary-label">Cards Studied</span>
                          </div>
                          <div className="s-summary-item">
                            <span className="s-summary-val">{totalMastered}</span>
                            <span className="s-summary-label">Cards Mastered</span>
                          </div>
                          <div className="s-summary-item">
                            <span className="s-summary-val">{totalMinutes > 0 ? `${totalMinutes}m` : '—'}</span>
                            <span className="s-summary-label">Study Time</span>
                          </div>
                          <div className="s-summary-item">
                            <span className="s-summary-val" style={{ color: avgAccuracy >= 80 ? '#10B981' : avgAccuracy >= 60 ? '#F59E0B' : '#EF4444' }}>{avgAccuracy}%</span>
                            <span className="s-summary-label">Avg Accuracy</span>
                          </div>
                          <div className="s-summary-item">
                            <span className="s-summary-val">{completionRate}%</span>
                            <span className="s-summary-label">Completion</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

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
                              <div className="s-bar-track"><div className="s-bar-fill" style={{ width: `${(completed / total) * 100}%`, background: '#10B981' }}></div></div>
                              <span className="s-bar-value">{completed}</span>
                            </div>
                            <div className="s-bar-row">
                              <span className="s-bar-label">In Progress</span>
                              <div className="s-bar-track"><div className="s-bar-fill" style={{ width: `${(inProgress / total) * 100}%`, background: '#3B82F6' }}></div></div>
                              <span className="s-bar-value">{inProgress}</span>
                            </div>
                            <div className="s-bar-row">
                              <span className="s-bar-label">Not Started</span>
                              <div className="s-bar-track"><div className="s-bar-fill" style={{ width: `${(notStarted / total) * 100}%`, background: '#6B7280' }}></div></div>
                              <span className="s-bar-value">{notStarted}</span>
                            </div>
                            {overdue > 0 && (
                              <div className="s-bar-row">
                                <span className="s-bar-label">Overdue</span>
                                <div className="s-bar-track"><div className="s-bar-fill" style={{ width: `${(overdue / total) * 100}%`, background: '#EF4444' }}></div></div>
                                <span className="s-bar-value">{overdue}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

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

                {/* Achievements */}
                <div className="s-section">
                  <h2 className="s-section-title"><ion-icon name="ribbon" style={{ marginRight: 6, verticalAlign: 'middle', color: '#F59E0B' }}></ion-icon>Achievements</h2>
                  <div className="s-achievements-grid">
                    <div className={`s-achievement ${completedAssignments.length >= 1 ? 'unlocked' : 'locked'}`}>
                      <span className="s-ach-icon"><ion-icon name="flag"></ion-icon></span>
                      <div><strong>First Task</strong><span>Complete your first assignment</span></div>
                    </div>
                    <div className={`s-achievement ${completedAssignments.length >= 5 ? 'unlocked' : 'locked'}`}>
                      <span className="s-ach-icon"><ion-icon name="library"></ion-icon></span>
                      <div><strong>Scholar</strong><span>Complete 5 assignments</span></div>
                    </div>
                    <div className={`s-achievement ${xp.current_streak >= 3 ? 'unlocked' : 'locked'}`}>
                      <span className="s-ach-icon"><ion-icon name="flame"></ion-icon></span>
                      <div><strong>On Fire</strong><span>3-day study streak</span></div>
                    </div>
                    <div className={`s-achievement ${xp.current_streak >= 7 ? 'unlocked' : 'locked'}`}>
                      <span className="s-ach-icon"><ion-icon name="flash"></ion-icon></span>
                      <div><strong>Week Warrior</strong><span>7-day study streak</span></div>
                    </div>
                    <div className={`s-achievement ${xp.total_xp >= 100 ? 'unlocked' : 'locked'}`}>
                      <span className="s-ach-icon"><ion-icon name="speedometer"></ion-icon></span>
                      <div><strong>Century</strong><span>Earn 100 XP total</span></div>
                    </div>
                    <div className={`s-achievement ${xp.total_xp >= 500 ? 'unlocked' : 'locked'}`}>
                      <span className="s-ach-icon"><ion-icon name="star"></ion-icon></span>
                      <div><strong>Star Student</strong><span>Earn 500 XP total</span></div>
                    </div>
                    <div className={`s-achievement ${groups.length >= 3 ? 'unlocked' : 'locked'}`}>
                      <span className="s-ach-icon"><ion-icon name="people"></ion-icon></span>
                      <div><strong>Social Learner</strong><span>Join 3 groups</span></div>
                    </div>
                    <div className={`s-achievement ${assignments.some(a => (a.my_progress?.accuracy || 0) === 100) ? 'unlocked' : 'locked'}`}>
                      <span className="s-ach-icon"><ion-icon name="trophy"></ion-icon></span>
                      <div><strong>Perfect Score</strong><span>100% accuracy on an assignment</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* INBOX TAB */}
            {activeTab === "inbox" && (
              <div className="s-content">
                <div className="s-page-header">
                  <div>
                    <h1>Inbox</h1>
                    <p className="s-subtitle">Friend requests & notifications</p>
                  </div>
                  {unreadCount > 0 && (
                    <button className="s-btn s-btn-outline" onClick={markAllRead}>Mark All Read</button>
                  )}
                </div>

                {/* Friend Requests Section */}
                <div className="s-section">
                  <h2 className="s-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ion-icon name="person-add-outline"></ion-icon>
                    Friend Requests {pendingRequests.length > 0 && <span className="s-nav-count s-nav-count-alert">{pendingRequests.length}</span>}
                  </h2>
                  {inboxLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                      <div className="s-spinner" />
                    </div>
                  ) : pendingRequests.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                      <p>No pending friend requests</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {pendingRequests.map(req => (
                        <div key={req.connection_id} className="s-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#7C5CFC20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600, color: '#7C5CFC', flexShrink: 0 }}>
                            {req.user?.avatar_url ? (
                              <img src={req.user.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              (req.user?.display_name || "U").charAt(0).toUpperCase()
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Link href={`/profile/${req.user?.username || req.user?.id}`} style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
                              {req.user?.display_name || "Unknown User"}
                            </Link>
                            {req.user?.username && <div style={{ fontSize: 13, color: '#94a3b8' }}>@{req.user.username}</div>}
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                              {req.user?.role?.toUpperCase()} · {new Date(req.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button className="s-btn s-btn-primary s-btn-sm" onClick={() => handleAcceptReject(req.connection_id, "accept")}>
                              <ion-icon name="checkmark-outline"></ion-icon> Accept
                            </button>
                            <button className="s-btn s-btn-sm" style={{ background: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }} onClick={() => handleAcceptReject(req.connection_id, "reject")}>
                              <ion-icon name="close-outline"></ion-icon> Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Friends Section */}
                {myConnections.length > 0 && (
                  <div className="s-section">
                    <h2 className="s-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ion-icon name="people-outline"></ion-icon>
                      Friends ({myConnections.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {myConnections.map(conn => (
                        <div key={conn.connection_id} className="s-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#10B98120', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: '#10B981', flexShrink: 0 }}>
                            {conn.user?.avatar_url ? (
                              <img src={conn.user.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              (conn.user?.display_name || "U").charAt(0).toUpperCase()
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Link href={`/profile/${conn.user?.username || conn.user?.id}`} style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
                              {conn.user?.display_name || "Unknown"}
                            </Link>
                            {conn.user?.username && <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 8 }}>@{conn.user.username}</span>}
                          </div>
                          <span style={{ fontSize: 12, color: '#64748b' }}>Connected {new Date(conn.since).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notifications Section */}
                <div className="s-section">
                  <h2 className="s-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ion-icon name="notifications-outline"></ion-icon>
                    Notifications
                  </h2>
                  {notifications.length === 0 ? (
                    <div className="s-empty-state">
                      <div className="s-empty-icon"><ion-icon name="notifications-outline" style={{ fontSize: 48 }}></ion-icon></div>
                      <h3>No notifications</h3>
                      <p>You&apos;ll see updates from your teachers and groups here.</p>
                    </div>
                  ) : (
                    <div className="s-notif-list">
                      {notifications.map(n => (
                        <div key={n.id} className={`s-notif-item ${!n.is_read ? 'unread' : ''}`} onClick={() => !n.is_read && markOneRead(n.id)} style={{ cursor: !n.is_read ? 'pointer' : 'default' }}>
                          <div className="s-notif-icon">
                            <ion-icon name={n.type === 'connection_request' ? 'hand-left' : n.type === 'connection_accepted' ? 'people' : n.type === 'assignment_new' ? 'document-text' : n.type === 'assignment_graded' ? 'star' : n.type === 'xp_earned' ? 'flash' : n.type === 'group_joined' ? 'people-circle' : 'notifications'}></ion-icon>
                          </div>
                          <div className="s-notif-body">
                            <div className="s-notif-title">{n.title}</div>
                            <div className="s-notif-msg">{n.message}</div>
                            <div className="s-notif-time">{new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                          {!n.is_read && <div className="s-notif-dot"></div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="s-content">
                <div className="s-page-header">
                  <h1>Settings</h1>
                  <p className="s-subtitle">Manage your account and preferences</p>
                </div>

                {/* Profile Editing Section — moved from Profile tab */}
                <div className="s-section">
                  <h2 className="s-section-title">Edit Profile</h2>
                  <div className="t-settings-card">
                    <form onSubmit={saveProfile} className="s-profile-form">
                      <div className="s-form-row">
                        <div className="s-form-group">
                          <label>Display Name *</label>
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your full name" maxLength={100} required />
                        </div>
                        <div className="s-form-group">
                          <label>Username</label>
                          <input type="text" value={editNickname} onChange={e => setEditNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))} placeholder="username" maxLength={50} />
                          <span className="s-form-hint">{editNickname ? `anki.sodops.uz/profile/${editNickname}` : 'Set a username for your public profile URL'}</span>
                        </div>
                      </div>
                      <div className="s-form-group">
                        <label>Bio</label>
                        <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Tell others about yourself..." rows={3} maxLength={500} />
                        <span className="s-char-count">{editBio.length}/500</span>
                      </div>
                      <div className="s-form-row">
                        <div className="s-form-group">
                          <label>Phone</label>
                          <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+998 90 123 45 67" maxLength={20} />
                        </div>
                        <div className="s-form-group">
                          <label>Avatar URL</label>
                          <input type="url" value={editAvatar} onChange={e => setEditAvatar(e.target.value)} placeholder="https://example.com/avatar.jpg" />
                          <span className="s-form-hint">Paste a link to your profile picture</span>
                        </div>
                      </div>
                      <button type="submit" className="s-btn s-btn-primary" disabled={savingProfile} style={{ marginTop: 8 }}>
                        {savingProfile ? "Saving..." : "Save Profile"}
                      </button>
                    </form>
                  </div>
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
                      <input type="number" className="t-settings-input" value={settings.dailyGoal} min={5} max={200} onChange={e => updateSetting('dailyGoal', Number(e.target.value))} />
                    </div>
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">New Cards / Day</div>
                        <div className="t-settings-sublabel">Max new cards introduced</div>
                      </div>
                      <input type="number" className="t-settings-input" value={settings.newCardsPerDay} min={0} max={100} onChange={e => updateSetting('newCardsPerDay', Number(e.target.value))} />
                    </div>
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Max Reviews / Day</div>
                        <div className="t-settings-sublabel">Max reviews per session</div>
                      </div>
                      <input type="number" className="t-settings-input" value={settings.maxReviews} min={10} max={500} onChange={e => updateSetting('maxReviews', Number(e.target.value))} />
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
                      <input type="range" value={settings.cardFontSize} min={16} max={64} style={{ width: 120 }} onChange={e => {
                        updateSetting('cardFontSize', Number(e.target.value));
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
                      <label className="t-toggle"><input type="checkbox" checked={settings.tts} onChange={e => updateSetting('tts', e.target.checked)} /><span className="t-toggle-slider"></span></label>
                    </div>
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Sound Effects</div>
                        <div className="t-settings-sublabel">Sounds on correct/wrong</div>
                      </div>
                      <label className="t-toggle"><input type="checkbox" checked={settings.soundEffects} onChange={e => updateSetting('soundEffects', e.target.checked)} /><span className="t-toggle-slider"></span></label>
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
                      <select className="t-settings-select" value={settings.algorithm} onChange={e => updateSetting('algorithm', e.target.value)}>
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
        <button className={`s-bottom-nav-item ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => switchTab('inbox')} style={{ position: 'relative' }}>
          <ion-icon name="mail-outline"></ion-icon>
          <span>Inbox</span>
          {(unreadCount + pendingRequests.length) > 0 && <span style={{ position: 'absolute', top: 4, right: '50%', marginRight: -12, width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }}></span>}
        </button>
        <button className={`s-bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => switchTab('settings')}>
          <ion-icon name="settings-outline"></ion-icon>
          <span>Settings</span>
        </button>
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div className="s-toast-overlay">
          <div className={`s-toast s-toast-${toast.type}`}>
            <span className="s-toast-icon">
              <ion-icon name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'close-circle' : 'information-circle'}></ion-icon>
            </span>
            <span className="s-toast-msg">{toast.message}</span>
            <button className="s-toast-close" onClick={() => setToast(null)}>×</button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="s-modal-overlay" onClick={() => { confirmModal.onCancel?.(); setConfirmModal(null); }}>
          <div className="s-modal-card" onClick={e => e.stopPropagation()}>
            <h3 className="s-modal-title">Confirm</h3>
            <p className="s-modal-message">{confirmModal.message}</p>
            <div className="s-modal-actions">
              <button className="s-btn s-btn-outline" onClick={() => { confirmModal.onCancel?.(); setConfirmModal(null); }}>Cancel</button>
              <button className="s-btn s-btn-primary" onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ a, onComplete, completingId }: { a: Assignment; onComplete?: (id: string, title: string) => void; completingId?: string | null }) {
  const prog = a.my_progress;
  const pct = prog ? Math.min(100, Math.round(((prog.cards_mastered || 0) / Math.max(prog.cards_studied || 1, 1)) * 100)) : 0;
  const isOverdue = a.deadline && new Date(a.deadline) < new Date();
  const isCompleted = prog?.status === "completed";
  const isInProgress = prog?.status === "in_progress";
  const isCompleting = completingId === a.id;

  return (
    <div className={`s-assign-card ${isOverdue && !isCompleted ? 'overdue' : ''} ${isCompleted ? 'completed' : ''}`}>
      <div className="s-assign-top">
        <div>
          <div className="s-assign-title">{a.title}</div>
          {a.description && <div className="s-assign-desc">{a.description}</div>}
          <div className="s-assign-meta">
            {a.group_name && <span className="s-group-chip" style={{ background: a.group_color || '#7C5CFC' }}>{a.group_name}</span>}
            {a.deadline && (
              <span className={`s-deadline ${isOverdue && !isCompleted ? 'overdue' : ''}`}>
                <ion-icon name="time-outline"></ion-icon>
                {new Date(a.deadline).toLocaleDateString()}
              </span>
            )}
            <span className="s-xp-tag"><ion-icon name="flash" style={{ fontSize: 12 }}></ion-icon> {a.xp_reward} XP</span>
            <span className={`s-status ${prog?.status || 'not_started'}`}>{isCompleted ? 'Done' : prog?.status === 'in_progress' ? 'In Progress' : 'Not Started'}</span>
          </div>
        </div>
        <div className="s-assign-actions">
          <a href={`/student/study/${a.id}`} className={`s-btn ${isCompleted ? 's-btn-outline' : 's-btn-primary'} s-btn-sm`}>
            <ion-icon name={isCompleted ? 'eye-outline' : 'play'}></ion-icon> {isCompleted ? 'Review' : 'Study'}
          </a>
          {isInProgress && !isCompleted && onComplete && (
            <button
              className="s-btn s-btn-success s-btn-sm"
              onClick={() => onComplete(a.id, a.title)}
              disabled={isCompleting}
              title="Mark this assignment as completed"
            >
              {isCompleting ? (
                <><span className="s-btn-spinner"></span> Completing...</>
              ) : (
                <><ion-icon name="checkmark-done"></ion-icon> Complete</>
              )}
            </button>
          )}
        </div>
      </div>
      {prog && (prog.cards_studied > 0 || isCompleted) && (
        <div className="s-assign-progress">
          <div className="s-progress-info">
            <span>{prog.cards_studied} studied · {prog.cards_mastered} mastered</span>
            <span>{prog.accuracy ? Math.round(prog.accuracy) : 0}% accuracy</span>
          </div>
          <div className="s-progress-bar">
            <div className="s-progress-fill" style={{ width: `${Math.round(prog.accuracy || 0)}%`, background: isCompleted ? (prog.accuracy >= 80 ? '#10B981' : prog.accuracy >= 60 ? '#F59E0B' : '#EF4444') : undefined }}></div>
          </div>
          <div className="s-progress-extra">
            <span>{prog.total_reviews} reviews</span>
            {prog.xp_earned > 0 && <span><ion-icon name="flash" style={{ fontSize: 12 }}></ion-icon> {prog.xp_earned} XP earned</span>}
          </div>
        </div>
      )}
    </div>
  );
}
