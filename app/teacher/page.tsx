"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

export default function TeacherPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f14', color: '#fff' }}><div className="t-spinner" /></div>}>
      <TeacherDashboard />
    </Suspense>
  );
}

interface Group {
  id: string;
  name: string;
  description: string;
  color: string;
  join_code: string;
  max_members: number;
  member_count: number;
  assignment_count: number;
  created_at: string;
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
  created_at: string;
  progress_summary?: {
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    avg_accuracy: number;
  };
}

interface Deck {
  id: string;
  name: string;
  cards_count?: number;
}

const COLORS = [
  "#7C5CFC", "#9B7FFF", "#EC4899", "#EF4444",
  "#F59E0B", "#10B981", "#06B6D4", "#3B82F6",
];

function TeacherDashboard() {
  const { user, loading, role, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"overview" | "groups" | "assignments" | "statistics" | "create-group" | "create-assignment" | "inbox" | "profile" | "settings">("overview");
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create group form
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupColor, setGroupColor] = useState(COLORS[0]);

  // Create assignment form
  const [assignGroup, setAssignGroup] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignDeadline, setAssignDeadline] = useState("");
  const [assignXP, setAssignXP] = useState(50);
  const [assignDecks, setAssignDecks] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Statistics state
  const [teacherStats, setTeacherStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Settings state (persisted to localStorage)
  const [settings, setSettings] = useState({
    dailyGoal: 20, newCardsPerDay: 20, maxReviews: 100,
    cardFontSize: 32, tts: true, soundEffects: false,
    studyReminders: true, assignmentUpdates: true, algorithm: 'sm-2'
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ankiflow-teacher-settings');
      if (saved) setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem('ankiflow-teacher-settings', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  // Copy join code handler
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess("Join code copied!");
    setTimeout(() => setSuccess(""), 2000);
  };

  const copyJoinLink = (code: string) => {
    const link = `${window.location.origin}/join?code=${code}`;
    navigator.clipboard.writeText(link);
    setSuccess("Invite link copied!");
    setTimeout(() => setSuccess(""), 2000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [groupsRes, assignRes, syncRes] = await Promise.all([
        fetch("/api/groups"),
        fetch("/api/assignments"),
        fetch("/api/sync"),
      ]);
      
      if (groupsRes.ok) {
        const gd = await groupsRes.json();
        setGroups(gd.groups || []);
      }
      if (assignRes.ok) {
        const ad = await assignRes.json();
        setAssignments(ad.assignments || []);
      }
      if (syncRes.ok) {
        const sd = await syncRes.json();
        const allDecks = sd.state?.decks || sd.data?.decks || sd.decks || [];
        console.log("[Teacher] Sync response:", { type: sd.type, deckCount: allDecks.length, decks: allDecks.slice(0, 3) });
        setDecks(allDecks.map((d: any) => ({ id: d.id, name: d.name, cards_count: d.cards?.length || d.cards_count || 0 })));
      } else {
        console.error("[Teacher] Sync failed:", syncRes.status, await syncRes.text());
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && (role === "teacher" || role === "admin")) {
      fetchData();
    }
  }, [loading, user, role, fetchData]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName, description: groupDesc, color: groupColor }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSuccess("Group created successfully!");
      setTimeout(() => setSuccess(""), 3000);
      setGroupName(""); setGroupDesc(""); setGroupColor(COLORS[0]);
      setActiveTab("groups");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle.trim() || !assignGroup) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: assignGroup,
          title: assignTitle,
          description: assignDesc,
          deadline: assignDeadline || null,
          xp_reward: assignXP,
          deck_ids: assignDecks,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSuccess("Assignment created!");
      setTimeout(() => setSuccess(""), 3000);
      setAssignTitle(""); setAssignDesc(""); setAssignDeadline(""); setAssignXP(50); setAssignDecks([]);
      setActiveTab("assignments");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    setConfirmModal({
      message: "Delete this group? All assignments and progress will be lost.",
      onConfirm: async () => {
        try {
          await fetch(`/api/groups/${id}`, { method: "DELETE" });
          setSuccess("Group deleted");
          setTimeout(() => setSuccess(""), 2000);
          fetchData();
        } catch {}
      }
    });
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/teacher/stats");
      if (res.ok) {
        const data = await res.json();
        setTeacherStats(data);
      }
    } catch {} finally {
      setStatsLoading(false);
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
      setSuccess("Profile updated!");
      setTimeout(() => setSuccess(""), 2000);
      fetchProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Inbox state
  const [inboxRequests, setInboxRequests] = useState<any[]>([]);
  const [inboxConnections, setInboxConnections] = useState<any[]>([]);
  const [inboxNotifications, setInboxNotifications] = useState<any[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);

  const fetchInbox = useCallback(async () => {
    setInboxLoading(true);
    try {
      const [connRes, notifRes] = await Promise.all([
        fetch("/api/connections").catch(() => null),
        fetch("/api/notifications").catch(() => null),
      ]);
      if (connRes?.ok) {
        const d = await connRes.json();
        setInboxRequests(d.pending_requests || []);
        setInboxConnections(d.connections || []);
      }
      if (notifRes?.ok) {
        const d = await notifRes.json();
        setInboxNotifications(d.notifications || []);
        setInboxUnread(d.unread_count || 0);
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
      setSuccess(action === "accept" ? "Connection accepted!" : "Request declined");
      setTimeout(() => setSuccess(""), 2000);
      fetchInbox();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const markNotifRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setInboxNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setInboxUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllNotifsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setInboxNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setInboxUnread(0);
    } catch {}
  };

  // Read query params on mount
  useEffect(() => {
    const tab = searchParams.get("tab");
    const group = searchParams.get("group");
    if (tab === "create") {
      setActiveTab("create-assignment");
      if (group) setAssignGroup(group);
    } else if (tab === "inbox") {
      setActiveTab("inbox");
    }
  }, [searchParams]);

  // Fetch stats/profile/inbox when tab changes
  useEffect(() => {
    if (activeTab === "statistics" && !teacherStats) fetchStats();
    if (activeTab === "profile") {
      if (!profileData) fetchProfile();
      if (!teacherStats) fetchStats();
    }
    if (activeTab === "inbox") fetchInbox();
  }, [activeTab]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f14', color: '#fff' }}>
        <div className="t-spinner" />
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

  // Role guard: only after loading is done (checked above), redirect non-teachers
  if (role !== "teacher" && role !== "admin") {
    if (typeof window !== "undefined") {
      window.location.href = "/student";
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f14', color: '#fff', gap: 12 }}>
        <div className="t-spinner" />
        <p style={{ color: '#94a3b8' }}>Redirecting to student dashboard...</p>
      </div>
    );
  }

  const totalStudents = groups.reduce((s, g) => s + (g.member_count - 1), 0);
  const activeAssignments = assignments.filter(a => a.status === "active").length;
  const overdueCount = assignments.filter(a => a.deadline && new Date(a.deadline) < new Date() && a.status === "active").length;

  return (
    <div className="t-dashboard">
      {/* Mobile Header */}
      <div className="t-mobile-header">
        <button className="t-hamburger" onClick={() => setSidebarOpen(true)}>
          <ion-icon name="menu-outline"></ion-icon>
        </button>
        <span className="t-brand-icon"><ion-icon name="flash"></ion-icon></span>
        <span className="t-brand-name">AnkiFlow</span>
        <span className="t-role-tag">Teacher</span>
      </div>
      
      {/* Mobile Overlay */}
      <div className={`t-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`t-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="t-brand">
          <button className="t-sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title="Toggle sidebar">
            <ion-icon name={sidebarCollapsed ? 'chevron-forward-outline' : 'chevron-back-outline'}></ion-icon>
          </button>
          <span className="t-brand-icon"><ion-icon name="flash"></ion-icon></span>
          <span className="t-brand-name">AnkiFlow</span>
          <span className="t-role-tag">Teacher</span>
        </div>

        <nav className="t-nav">
          <button className={`t-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => switchTab('overview')}>
            <ion-icon name="grid-outline"></ion-icon>
            <span>Overview</span>
          </button>
          <button className={`t-nav-item ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => switchTab('groups')}>
            <ion-icon name="people-outline"></ion-icon>
            <span>Groups</span>
            {groups.length > 0 && <span className="t-nav-count">{groups.length}</span>}
          </button>
          <button className={`t-nav-item ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => switchTab('assignments')}>
            <ion-icon name="document-text-outline"></ion-icon>
            <span>Assignments</span>
            {activeAssignments > 0 && <span className="t-nav-count">{activeAssignments}</span>}
          </button>
          <button className={`t-nav-item ${activeTab === 'statistics' ? 'active' : ''}`} onClick={() => switchTab('statistics')}>
            <ion-icon name="stats-chart-outline"></ion-icon>
            <span>Statistics</span>
          </button>
          <button className={`t-nav-item ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => switchTab('inbox')}>
            <ion-icon name="mail-outline"></ion-icon>
            <span>Inbox</span>
            {(inboxRequests.length + inboxUnread) > 0 && <span className="t-nav-count t-nav-count-alert">{inboxRequests.length + inboxUnread}</span>}
          </button>
        </nav>

        <div className="t-nav-divider"></div>

        <nav className="t-nav">
          <button className={`t-nav-item ${activeTab === 'create-group' ? 'active' : ''}`} onClick={() => switchTab('create-group')}>
            <ion-icon name="add-circle-outline"></ion-icon>
            <span>New Group</span>
          </button>
          <button className={`t-nav-item ${activeTab === 'create-assignment' ? 'active' : ''}`} onClick={() => switchTab('create-assignment')}>
            <ion-icon name="create-outline"></ion-icon>
            <span>New Assignment</span>
          </button>
        </nav>

        <div className="t-nav-divider"></div>
        
        <nav className="t-nav">
          <a href="/app/study" className="t-nav-item">
            <ion-icon name="flash-outline"></ion-icon>
            <span>Flashcards</span>
          </a>
          <button className={`t-nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => switchTab('profile')}>
            <ion-icon name="person-outline"></ion-icon>
            <span>My Profile</span>
          </button>
          <button className={`t-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => switchTab('settings')}>
            <ion-icon name="settings-outline"></ion-icon>
            <span>Settings</span>
          </button>
          {role === "admin" && (
            <a href="/admin/dashboard" className="t-nav-item">
              <ion-icon name="settings-outline"></ion-icon>
              <span>Admin Panel</span>
            </a>
          )}
        </nav>

        <div className="t-sidebar-footer">
          <div className="t-user-info">
            <div className="t-user-avatar">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" />
              ) : (
                <span>{(user.user_metadata?.full_name || user.email || "T").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="t-user-details">
              <div className="t-user-name">{user.user_metadata?.full_name || user.email?.split("@")[0] || "Teacher"}</div>
              <div className="t-user-email">{user.email}</div>
            </div>
          </div>
          <button className="t-logout-btn" onClick={signOut} title="Sign out">
            <ion-icon name="log-out-outline"></ion-icon>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="t-main">
        {/* Alerts */}
        {error && (
          <div className="t-alert t-alert-error">
            <ion-icon name="alert-circle"></ion-icon>
            <span>{error}</span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        {success && (
          <div className="t-alert t-alert-success">
            <ion-icon name="checkmark-circle"></ion-icon>
            <span>{success}</span>
            <button onClick={() => setSuccess("")}>×</button>
          </div>
        )}

        {loadingData ? (
          <div className="t-loading-content">
            <div className="t-spinner" />
            <span>Loading your data...</span>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="t-content">
                <div className="t-page-header">
                  <div>
                    <h1>Welcome back, {user.user_metadata?.full_name || user.email?.split("@")[0] || "Teacher"}</h1>
                    <p className="t-subtitle">Here&apos;s what&apos;s happening with your classes</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="t-stats-row">
                  <div className="t-stat-card">
                    <div className="t-stat-icon" style={{ background: 'rgba(124,92,252,0.1)', color: '#7C5CFC' }}>
                      <ion-icon name="people"></ion-icon>
                    </div>
                    <div>
                      <div className="t-stat-value">{groups.length}</div>
                      <div className="t-stat-label">Groups</div>
                    </div>
                  </div>
                  <div className="t-stat-card">
                    <div className="t-stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                      <ion-icon name="school"></ion-icon>
                    </div>
                    <div>
                      <div className="t-stat-value">{totalStudents}</div>
                      <div className="t-stat-label">Students</div>
                    </div>
                  </div>
                  <div className="t-stat-card">
                    <div className="t-stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                      <ion-icon name="document-text"></ion-icon>
                    </div>
                    <div>
                      <div className="t-stat-value">{activeAssignments}</div>
                      <div className="t-stat-label">Active Tasks</div>
                    </div>
                  </div>
                  <div className="t-stat-card">
                    <div className="t-stat-icon" style={{ background: overdueCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)', color: overdueCount > 0 ? '#EF4444' : '#6B7280' }}>
                      <ion-icon name="time"></ion-icon>
                    </div>
                    <div>
                      <div className="t-stat-value">{overdueCount}</div>
                      <div className="t-stat-label">Overdue</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="t-section">
                  <h2 className="t-section-title">Quick Actions</h2>
                  <div className="t-quick-actions">
                    <button className="t-quick-action" onClick={() => setActiveTab("create-group")}>
                      <ion-icon name="people-outline"></ion-icon>
                      <span>Create Group</span>
                    </button>
                    <button className="t-quick-action" onClick={() => setActiveTab("create-assignment")}>
                      <ion-icon name="create-outline"></ion-icon>
                      <span>New Assignment</span>
                    </button>
                    <a href="/app/study" className="t-quick-action">
                      <ion-icon name="flash-outline"></ion-icon>
                      <span>Flashcards</span>
                    </a>
                  </div>
                </div>

                {/* Recent Groups */}
                {groups.length > 0 && (
                  <div className="t-section">
                    <div className="t-section-header">
                      <h2 className="t-section-title">Your Groups</h2>
                      <button className="t-link-btn" onClick={() => setActiveTab("groups")}>View All →</button>
                    </div>
                    <div className="t-card-grid">
                      {groups.slice(0, 4).map(g => (
                        <Link href={`/groups/${g.id}`} key={g.id} className="t-group-card" style={{ borderTopColor: g.color }}>
                          <div className="t-group-card-header">
                            <div className="t-group-dot" style={{ background: g.color }}></div>
                            <h3>{g.name}</h3>
                          </div>
                          <p className="t-group-desc">{g.description || "No description"}</p>
                          <div className="t-group-footer">
                            <span><ion-icon name="people-outline"></ion-icon> {g.member_count} members</span>
                            <span><ion-icon name="document-text-outline"></ion-icon> {g.assignment_count} tasks</span>
                          </div>
                          <div className="t-group-code" onClick={(e) => { e.preventDefault(); copyCode(g.join_code); }}>
                            <span>Code: <strong>{g.join_code}</strong></span>
                            <ion-icon name="copy-outline"></ion-icon>
                          </div>
                          <div className="t-group-code t-group-link" onClick={(e) => { e.preventDefault(); copyJoinLink(g.join_code); }}>
                            <span><ion-icon name="link-outline"></ion-icon> Copy Invite Link</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Assignments */}
                {assignments.length > 0 && (
                  <div className="t-section">
                    <div className="t-section-header">
                      <h2 className="t-section-title">Recent Assignments</h2>
                      <button className="t-link-btn" onClick={() => setActiveTab("assignments")}>View All →</button>
                    </div>
                    <div className="t-assign-list">
                      {assignments.slice(0, 5).map(a => {
                        const ps = a.progress_summary;
                        const pct = ps && ps.total > 0 ? Math.round((ps.completed / ps.total) * 100) : 0;
                        const isOverdue = a.deadline && new Date(a.deadline) < new Date();
                        return (
                          <Link href={`/teacher/assignments/${a.id}`} key={a.id} className={`t-assign-row ${isOverdue ? 'overdue' : ''}`}>
                            <div className="t-assign-row-left">
                              <span className="t-assign-dot" style={{ background: a.group_color || '#7C5CFC' }}></span>
                              <div>
                                <div className="t-assign-title">{a.title}</div>
                                <div className="t-assign-meta">
                                  {a.group_name && <span className="t-assign-group">{a.group_name}</span>}
                                  {a.deadline && (
                                    <span className={`t-assign-deadline ${isOverdue ? 'overdue' : ''}`}>
                                      <ion-icon name="time-outline"></ion-icon>
                                      {new Date(a.deadline).toLocaleDateString()}
                                    </span>
                                  )}
                                  <span className="t-assign-xp"><ion-icon name="flash" style={{ fontSize: 12 }}></ion-icon> {a.xp_reward} XP</span>
                                </div>
                              </div>
                            </div>
                            <div className="t-assign-row-right">
                              <div className="t-mini-progress">
                                <div className="t-mini-progress-fill" style={{ width: `${pct}%` }}></div>
                              </div>
                              <span className="t-assign-pct">{pct}%</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {groups.length === 0 && (
                  <div className="t-empty-state">
                    <div className="t-empty-icon"><ion-icon name="library-outline" style={{ fontSize: 48 }}></ion-icon></div>
                    <h3>Get Started!</h3>
                    <p>Create your first group and start assigning tasks to students.</p>
                    <button className="t-btn t-btn-primary" onClick={() => setActiveTab("create-group")}>
                      <ion-icon name="add-circle-outline"></ion-icon>
                      Create First Group
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* GROUPS TAB */}
            {activeTab === "groups" && (
              <div className="t-content">
                <div className="t-page-header">
                  <div>
                    <h1>Your Groups</h1>
                    <p className="t-subtitle">{groups.length} group{groups.length !== 1 ? 's' : ''} · {totalStudents} student{totalStudents !== 1 ? 's' : ''}</p>
                  </div>
                  <button className="t-btn t-btn-primary" onClick={() => setActiveTab("create-group")}>
                    <ion-icon name="add-circle-outline"></ion-icon>
                    New Group
                  </button>
                </div>

                {groups.length === 0 ? (
                  <div className="t-empty-state">
                    <div className="t-empty-icon"><ion-icon name="people-outline" style={{ fontSize: 48 }}></ion-icon></div>
                    <h3>No groups yet</h3>
                    <p>Create a group and share the join code with your students.</p>
                    <button className="t-btn t-btn-primary" onClick={() => setActiveTab("create-group")}>Create Group</button>
                  </div>
                ) : (
                  <div className="t-card-grid">
                    {groups.map(g => (
                      <div key={g.id} className="t-group-card" style={{ borderTopColor: g.color }}>
                        <div className="t-group-card-header">
                          <div className="t-group-dot" style={{ background: g.color }}></div>
                          <h3>{g.name}</h3>
                        </div>
                        <p className="t-group-desc">{g.description || "No description"}</p>
                        <div className="t-group-footer">
                          <span><ion-icon name="people-outline"></ion-icon> {g.member_count} members</span>
                          <span><ion-icon name="document-text-outline"></ion-icon> {g.assignment_count} tasks</span>
                        </div>
                        <div className="t-group-code" onClick={() => copyCode(g.join_code)}>
                          <span>Join Code: <strong>{g.join_code}</strong></span>
                          <ion-icon name="copy-outline"></ion-icon>
                        </div>
                        <div className="t-group-code t-group-link" onClick={() => copyJoinLink(g.join_code)}>
                          <span><ion-icon name="link-outline"></ion-icon> Copy Invite Link</span>
                        </div>
                        <div className="t-group-actions">
                          <Link href={`/groups/${g.id}`} className="t-btn t-btn-sm t-btn-outline">
                            <ion-icon name="eye-outline"></ion-icon> Details
                          </Link>
                          <button className="t-btn t-btn-sm t-btn-danger" onClick={() => handleDeleteGroup(g.id)}>
                            <ion-icon name="trash-outline"></ion-icon> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ASSIGNMENTS TAB */}
            {activeTab === "assignments" && (
              <div className="t-content">
                <div className="t-page-header">
                  <div>
                    <h1>Assignments</h1>
                    <p className="t-subtitle">{assignments.length} total · {activeAssignments} active</p>
                  </div>
                  <button className="t-btn t-btn-primary" onClick={() => setActiveTab("create-assignment")}>
                    <ion-icon name="add-circle-outline"></ion-icon>
                    New Assignment
                  </button>
                </div>

                {assignments.length === 0 ? (
                  <div className="t-empty-state">
                    <div className="t-empty-icon"><ion-icon name="document-text-outline" style={{ fontSize: 48 }}></ion-icon></div>
                    <h3>No assignments yet</h3>
                    <p>Create an assignment and assign it to one of your groups.</p>
                    <button className="t-btn t-btn-primary" onClick={() => setActiveTab("create-assignment")}>Create Assignment</button>
                  </div>
                ) : (
                  <div className="t-assign-list">
                    {assignments.map(a => {
                      const ps = a.progress_summary;
                      const pct = ps && ps.total > 0 ? Math.round((ps.completed / ps.total) * 100) : 0;
                      const isOverdue = a.deadline && new Date(a.deadline) < new Date() && a.status === "active";
                      return (
                        <Link href={`/teacher/assignments/${a.id}`} key={a.id} className={`t-assign-card-full ${isOverdue ? 'overdue' : ''}`}>
                          <div className="t-assign-card-top">
                            <div>
                              <div className="t-assign-title-lg">{a.title}</div>
                              <div className="t-assign-meta">
                                {a.group_name && (
                                  <span className="t-group-chip" style={{ background: a.group_color || '#7C5CFC' }}>{a.group_name}</span>
                                )}
                                {a.deadline && (
                                  <span className={`t-assign-deadline ${isOverdue ? 'overdue' : ''}`}>
                                    <ion-icon name="time-outline"></ion-icon>
                                    {isOverdue ? 'Overdue: ' : 'Due: '}{new Date(a.deadline).toLocaleDateString()}
                                  </span>
                                )}
                                <span className="t-assign-xp"><ion-icon name="flash" style={{ fontSize: 12 }}></ion-icon> {a.xp_reward} XP</span>
                              </div>
                            </div>
                            <span className={`t-status-badge ${a.status}`}>{a.status}</span>
                          </div>
                          {ps && (
                            <div className="t-assign-progress-section">
                              <div className="t-progress-bar-lg">
                                <div className="t-progress-fill-lg" style={{ width: `${pct}%` }}></div>
                              </div>
                              <div className="t-progress-stats">
                                <span className="t-progress-done">{ps.completed} completed</span>
                                <span className="t-progress-wip">{ps.in_progress} in progress</span>
                                <span className="t-progress-pending">{ps.not_started} not started</span>
                                {ps.avg_accuracy > 0 && <span className="t-progress-acc">{Math.round(ps.avg_accuracy)}% avg accuracy</span>}
                              </div>
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* CREATE GROUP TAB */}
            {activeTab === "create-group" && (
              <div className="t-content">
                <div className="t-page-header">
                  <h1>Create New Group</h1>
                </div>
                <div className="t-form-card">
                  <form onSubmit={handleCreateGroup}>
                    <div className="t-form-group">
                      <label>Group Name *</label>
                      <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g., English 101" required />
                    </div>
                    <div className="t-form-group">
                      <label>Description</label>
                      <textarea value={groupDesc} onChange={e => setGroupDesc(e.target.value)} placeholder="Describe the group purpose..." rows={3} />
                    </div>
                    <div className="t-form-group">
                      <label>Color</label>
                      <div className="t-color-picker">
                        {COLORS.map(c => (
                          <button key={c} type="button" className={`t-color-swatch ${groupColor === c ? 'active' : ''}`}
                            style={{ background: c }} onClick={() => setGroupColor(c)} />
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="t-btn t-btn-primary t-btn-lg" disabled={submitting || !groupName.trim()}>
                      {submitting ? "Creating..." : "Create Group"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* CREATE ASSIGNMENT TAB */}
            {activeTab === "create-assignment" && (
              <div className="t-content">
                <div className="t-page-header">
                  <h1>Create New Assignment</h1>
                </div>
                {groups.length === 0 ? (
                  <div className="t-empty-state">
                    <div className="t-empty-icon"><ion-icon name="alert-circle-outline" style={{ fontSize: 48 }}></ion-icon></div>
                    <h3>Create a group first</h3>
                    <p>You need at least one group before creating assignments.</p>
                    <button className="t-btn t-btn-primary" onClick={() => setActiveTab("create-group")}>Create Group</button>
                  </div>
                ) : (
                  <div className="t-form-card">
                    <form onSubmit={handleCreateAssignment}>
                      <div className="t-form-group">
                        <label>Group *</label>
                        <select value={assignGroup} onChange={e => setAssignGroup(e.target.value)} required>
                          <option value="">Select a group...</option>
                          {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name} ({g.member_count} members)</option>
                          ))}
                        </select>
                      </div>
                      <div className="t-form-group">
                        <label>Title *</label>
                        <input type="text" value={assignTitle} onChange={e => setAssignTitle(e.target.value)} placeholder="e.g., Week 1 Vocabulary" required />
                      </div>
                      <div className="t-form-group">
                        <label>Description</label>
                        <textarea value={assignDesc} onChange={e => setAssignDesc(e.target.value)} placeholder="Instructions for students..." rows={3} />
                      </div>
                      <div className="t-form-row">
                        <div className="t-form-group">
                          <label>Deadline</label>
                          <input type="datetime-local" value={assignDeadline} onChange={e => setAssignDeadline(e.target.value)} />
                        </div>
                        <div className="t-form-group">
                          <label>XP Reward</label>
                          <input type="number" value={assignXP} onChange={e => setAssignXP(Number(e.target.value))} min={0} max={1000} />
                        </div>
                      </div>
                      <div className="t-form-group">
                        <label>Decks to Study {assignDecks.length > 0 && `(${assignDecks.length} selected)`}</label>
                        {decks.length > 0 ? (
                          <div className="t-deck-select">
                            {decks.map(d => (
                              <label key={d.id} className={`t-deck-option ${assignDecks.includes(d.id) ? 'selected' : ''}`}>
                                <input type="checkbox" checked={assignDecks.includes(d.id)}
                                  onChange={e => {
                                    if (e.target.checked) setAssignDecks(prev => [...prev, d.id]);
                                    else setAssignDecks(prev => prev.filter(id => id !== d.id));
                                  }} />
                                <span className="t-deck-option-name">{d.name}</span>
                                {d.cards_count !== undefined && <span className="t-deck-option-count">{d.cards_count} cards</span>}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="t-deck-select-empty">
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
                              No decks available. Go to <Link href="/app/study" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Flashcards</Link> to create or import decks first.
                            </p>
                          </div>
                        )}
                      </div>
                      <button type="submit" className="t-btn t-btn-primary t-btn-lg" disabled={submitting || !assignTitle.trim() || !assignGroup || assignDecks.length === 0}>
                        {submitting ? "Creating..." : "Create Assignment"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* STATISTICS TAB */}
            {activeTab === "statistics" && (
              <div className="t-content">
                <div className="t-page-header">
                  <h1>Statistics & Analytics</h1>
                  <p className="t-subtitle">Track student performance across your classes</p>
                  <button className="t-btn t-btn-outline" onClick={fetchStats} disabled={statsLoading}>
                    <ion-icon name="refresh-outline"></ion-icon> {statsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {statsLoading && !teacherStats ? (
                  <div className="t-loading-content"><div className="t-spinner" /><span>Loading statistics...</span></div>
                ) : teacherStats ? (
                  <>
                    {/* Overall Summary */}
                    <div className="t-stats-row">
                      <div className="t-stat-card">
                        <div className="t-stat-icon" style={{ background: '#7C5CFC20', color: '#7C5CFC' }}><ion-icon name="school"></ion-icon></div>
                        <div><div className="t-stat-value">{teacherStats.overall.total_students}</div><div className="t-stat-label">Total Students</div></div>
                      </div>
                      <div className="t-stat-card">
                        <div className="t-stat-icon" style={{ background: '#10B98120', color: '#10B981' }}><ion-icon name="checkmark-done"></ion-icon></div>
                        <div><div className="t-stat-value">{teacherStats.overall.completion_rate}%</div><div className="t-stat-label">Completion Rate</div></div>
                      </div>
                      <div className="t-stat-card">
                        <div className="t-stat-icon" style={{ background: '#F59E0B20', color: '#F59E0B' }}><ion-icon name="ribbon"></ion-icon></div>
                        <div><div className="t-stat-value">{teacherStats.overall.avg_accuracy}%</div><div className="t-stat-label">Avg Accuracy</div></div>
                      </div>
                      <div className="t-stat-card">
                        <div className="t-stat-icon" style={{ background: '#9B7FFF20', color: '#9B7FFF' }}><ion-icon name="layers"></ion-icon></div>
                        <div><div className="t-stat-value">{teacherStats.overall.total_reviews}</div><div className="t-stat-label">Total Reviews</div></div>
                      </div>
                    </div>

                    {/* Group Performance */}
                    {teacherStats.group_stats.length > 0 && (
                      <div className="t-section">
                        <h2 className="t-section-title"><ion-icon name="bar-chart-outline" style={{ marginRight: 8 }}></ion-icon> Group Performance</h2>
                        <div className="t-stats-table">
                          <div className="t-stats-table-header">
                            <span>Group</span>
                            <span>Students</span>
                            <span>Tasks</span>
                            <span>Completion</span>
                            <span>Avg Accuracy</span>
                            <span>Reviews</span>
                          </div>
                          {teacherStats.group_stats.map((g: any) => (
                            <div key={g.id} className="t-stats-table-row">
                              <span className="t-stats-group-name">
                                <span className="t-group-dot" style={{ background: g.color }}></span>
                                {g.name}
                              </span>
                              <span>{g.member_count}</span>
                              <span>{g.assignment_count}</span>
                              <span>
                                <div className="t-mini-progress" style={{ width: 60 }}>
                                  <div className="t-mini-progress-fill" style={{ width: `${g.completion_rate}%`, background: g.completion_rate >= 70 ? '#10B981' : g.completion_rate >= 40 ? '#F59E0B' : '#EF4444' }}></div>
                                </div>
                                <span className="t-pct">{g.completion_rate}%</span>
                              </span>
                              <span className={`t-accuracy-badge ${g.avg_accuracy >= 80 ? 'good' : g.avg_accuracy >= 60 ? 'mid' : 'low'}`}>
                                {g.avg_accuracy}%
                              </span>
                              <span>{g.total_reviews}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Students Leaderboard */}
                    {teacherStats.top_students.length > 0 && (
                      <div className="t-section">
                        <h2 className="t-section-title"><ion-icon name="trophy-outline" style={{ marginRight: 8 }}></ion-icon> Top Students</h2>
                        <div className="t-leaderboard">
                          {teacherStats.top_students.map((s: any, i: number) => (
                            <div key={s.id} className={`t-leaderboard-item ${i < 3 ? 'top-' + (i + 1) : ''}`}>
                              <span className="t-lb-rank">{`#${i + 1}`}</span>
                              <div className="t-lb-avatar">
                                {s.avatar_url ? (
                                  <img src={s.avatar_url} alt="" />
                                ) : (
                                  <span>{(s.name || "?").charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="t-lb-info">
                                <div className="t-lb-name">{s.name}</div>
                                <div className="t-lb-meta">
                                  {s.completed_tasks}/{s.total_tasks} tasks · {s.avg_accuracy}% accuracy
                                  {s.current_streak > 0 && <span> · <ion-icon name="flame" style={{ fontSize: 14, verticalAlign: 'middle', color: '#F59E0B' }}></ion-icon>{s.current_streak}</span>}
                                </div>
                              </div>
                              <div className="t-lb-xp"><ion-icon name="flash" style={{ fontSize: 14 }}></ion-icon> {s.total_xp} XP</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All Students Table */}
                    {teacherStats.students.length > 0 && (
                      <div className="t-section">
                        <h2 className="t-section-title"><ion-icon name="people-outline" style={{ marginRight: 8 }}></ion-icon> All Students ({teacherStats.students.length})</h2>
                        <div className="t-stats-table">
                          <div className="t-stats-table-header">
                            <span>Student</span>
                            <span>Tasks Done</span>
                            <span>Accuracy</span>
                            <span>Reviews</span>
                            <span>Time</span>
                            <span>XP</span>
                          </div>
                          {teacherStats.students.map((s: any) => (
                            <div key={s.id} className="t-stats-table-row">
                              <span className="t-stats-student-name">
                                <div className="t-lb-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                                  {s.avatar_url ? <img src={s.avatar_url} alt="" /> : <span>{(s.name || "?").charAt(0).toUpperCase()}</span>}
                                </div>
                                {s.name}
                              </span>
                              <span>{s.completed_tasks}/{s.total_tasks}</span>
                              <span className={`t-accuracy-badge ${s.avg_accuracy >= 80 ? 'good' : s.avg_accuracy >= 60 ? 'mid' : 'low'}`}>
                                {s.avg_accuracy}%
                              </span>
                              <span>{s.total_reviews}</span>
                              <span>{Math.round(s.total_time_seconds / 60)}m</span>
                              <span><ion-icon name="flash" style={{ fontSize: 12 }}></ion-icon> {s.total_xp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {teacherStats.students.length === 0 && (
                      <div className="t-empty-state">
                        <div className="t-empty-icon"><ion-icon name="bar-chart-outline" style={{ fontSize: 48 }}></ion-icon></div>
                        <h3>No student data yet</h3>
                        <p>Statistics will appear once students join your groups and start studying.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="t-empty-state">
                    <div className="t-empty-icon"><ion-icon name="bar-chart-outline" style={{ fontSize: 48 }}></ion-icon></div>
                    <h3>No statistics available</h3>
                    <p>Create groups and assignments to see student analytics.</p>
                  </div>
                )}
              </div>
            )}

            {/* INBOX TAB */}
            {activeTab === "inbox" && (
              <div className="t-content">
                <div className="t-page-header">
                  <div>
                    <h1>Inbox</h1>
                    <p className="t-subtitle">Friend requests & notifications</p>
                  </div>
                  {inboxUnread > 0 && (
                    <button className="t-btn t-btn-outline" onClick={markAllNotifsRead}>Mark All Read</button>
                  )}
                </div>

                {inboxLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div className="t-spinner" />
                  </div>
                ) : (
                  <>
                    {/* Friend Requests Section */}
                    <div className="t-section">
                      <h2 className="t-section-title">
                        <ion-icon name="person-add-outline" style={{ marginRight: 8 }}></ion-icon>
                        Friend Requests {inboxRequests.length > 0 && <span className="t-nav-count t-nav-count-alert" style={{ marginLeft: 8 }}>{inboxRequests.length}</span>}
                      </h2>
                      {inboxRequests.length === 0 ? (
                        <div className="t-empty-state" style={{ padding: '2rem' }}>
                          <div className="t-empty-icon"><ion-icon name="hand-left-outline" style={{ fontSize: 48 }}></ion-icon></div>
                          <p>No pending friend requests</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {inboxRequests.map(req => (
                            <div key={req.connection_id} className="t-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
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
                                <button className="t-btn t-btn-primary t-btn-sm" onClick={() => handleAcceptReject(req.connection_id, "accept")}>
                                  <ion-icon name="checkmark-outline"></ion-icon> Accept
                                </button>
                                <button className="t-btn t-btn-sm" style={{ background: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }} onClick={() => handleAcceptReject(req.connection_id, "reject")}>
                                  <ion-icon name="close-outline"></ion-icon> Decline
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Connections Section */}
                    {inboxConnections.length > 0 && (
                      <div className="t-section">
                        <h2 className="t-section-title">
                          <ion-icon name="people-outline" style={{ marginRight: 8 }}></ion-icon>
                          Friends ({inboxConnections.length})
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {inboxConnections.map(conn => (
                            <div key={conn.connection_id} className="t-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12 }}>
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
                    <div className="t-section">
                      <h2 className="t-section-title">
                        <ion-icon name="notifications-outline" style={{ marginRight: 8 }}></ion-icon>
                        Notifications
                      </h2>
                      {inboxNotifications.length === 0 ? (
                        <div className="t-empty-state" style={{ padding: '2rem' }}>
                          <div className="t-empty-icon"><ion-icon name="notifications-outline" style={{ fontSize: 48 }}></ion-icon></div>
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {inboxNotifications.map(n => (
                            <div key={n.id} onClick={() => !n.is_read && markNotifRead(n.id)} className="t-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, cursor: !n.is_read ? 'pointer' : 'default', opacity: n.is_read ? 0.6 : 1, borderLeft: !n.is_read ? '3px solid #7C5CFC' : '3px solid transparent' }}>
                              <div style={{ fontSize: 20, flexShrink: 0 }}>
                                <ion-icon name={n.type === 'connection_request' ? 'hand-left-outline' : n.type === 'connection_accepted' ? 'people-outline' : n.type === 'assignment_new' ? 'document-text-outline' : n.type === 'assignment_graded' ? 'star-outline' : n.type === 'xp_earned' ? 'flash-outline' : 'notifications-outline'}></ion-icon>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{n.title}</div>
                                <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>{n.message}</div>
                                <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                              {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C5CFC', flexShrink: 0, marginTop: 6 }}></div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PROFILE TAB — View Only */}
            {activeTab === "profile" && (
              <div className="t-content">
                <div className="t-page-header">
                  <h1>My Profile</h1>
                  <p className="t-subtitle">Your profile overview</p>
                </div>

                <div className="t-profile-card">
                  <div className="t-profile-header">
                    <div className="t-profile-avatar-lg">
                      {editAvatar ? (
                        <img src={editAvatar} alt="Avatar" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <span>{(editName || user?.email || "T").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="t-profile-header-info">
                      <h2>{editName || user?.email?.split("@")[0]}</h2>
                      <p className="t-profile-role">{role?.toUpperCase()} · {user?.email}</p>
                      {editNickname && <p className="t-profile-username">@{editNickname}</p>}
                      {profileData && (
                        <p className="t-profile-joined">Joined {new Date(profileData.created_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>

                  {/* View-only info */}
                  <div className="t-profile-details">
                    {editBio && (
                      <div className="t-profile-detail-row">
                        <span className="t-profile-detail-label">Bio</span>
                        <p className="t-profile-detail-value">{editBio}</p>
                      </div>
                    )}
                    <div className="t-profile-detail-row">
                      <span className="t-profile-detail-label">Email</span>
                      <p className="t-profile-detail-value">{profileData?.email || user?.email || "—"}</p>
                    </div>
                    {editPhone && (
                      <div className="t-profile-detail-row">
                        <span className="t-profile-detail-label">Phone</span>
                        <p className="t-profile-detail-value">{editPhone}</p>
                      </div>
                    )}
                    {editNickname && (
                      <div className="t-profile-detail-row">
                        <span className="t-profile-detail-label">Profile URL</span>
                        <p className="t-profile-detail-value">
                          <a href={`/profile/${editNickname}`} style={{ color: '#7C5CFC', textDecoration: 'none' }}>anki.sodops.uz/profile/{editNickname}</a>
                        </p>
                      </div>
                    )}
                  </div>

                  <button className="t-btn t-btn-outline" onClick={() => setActiveTab("settings")} style={{ marginTop: 16 }}>
                    <ion-icon name="settings-outline"></ion-icon> Edit Profile in Settings
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="t-section">
                  <h2 className="t-section-title">Quick Stats</h2>
                  <div className="t-stats-row">
                    <div className="t-stat-card">
                      <div className="t-stat-icon" style={{ background: '#7C5CFC20', color: '#7C5CFC' }}><ion-icon name="people"></ion-icon></div>
                      <div><div className="t-stat-value">{groups.length}</div><div className="t-stat-label">Groups</div></div>
                    </div>
                    <div className="t-stat-card">
                      <div className="t-stat-icon" style={{ background: '#10B98120', color: '#10B981' }}><ion-icon name="school"></ion-icon></div>
                      <div><div className="t-stat-value">{totalStudents}</div><div className="t-stat-label">Students</div></div>
                    </div>
                    <div className="t-stat-card">
                      <div className="t-stat-icon" style={{ background: '#F59E0B20', color: '#F59E0B' }}><ion-icon name="document-text"></ion-icon></div>
                      <div><div className="t-stat-value">{assignments.length}</div><div className="t-stat-label">Assignments</div></div>
                    </div>
                  </div>
                </div>

                {/* Detailed Statistics (embedded from Statistics tab) */}
                <div className="t-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 className="t-section-title" style={{ margin: 0 }}>
                      <ion-icon name="bar-chart-outline" style={{ marginRight: 8 }}></ion-icon> Performance Analytics
                    </h2>
                    <button className="t-btn t-btn-outline t-btn-sm" onClick={fetchStats} disabled={statsLoading}>
                      <ion-icon name="refresh-outline"></ion-icon> {statsLoading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>

                  {statsLoading && !teacherStats ? (
                    <div className="t-loading-content"><div className="t-spinner" /><span>Loading statistics...</span></div>
                  ) : teacherStats ? (
                    <>
                      {/* Overall Summary */}
                      <div className="t-stats-row">
                        <div className="t-stat-card">
                          <div className="t-stat-icon" style={{ background: '#7C5CFC20', color: '#7C5CFC' }}><ion-icon name="checkmark-done"></ion-icon></div>
                          <div><div className="t-stat-value">{teacherStats.overall.completion_rate}%</div><div className="t-stat-label">Completion Rate</div></div>
                        </div>
                        <div className="t-stat-card">
                          <div className="t-stat-icon" style={{ background: '#F59E0B20', color: '#F59E0B' }}><ion-icon name="ribbon"></ion-icon></div>
                          <div><div className="t-stat-value">{teacherStats.overall.avg_accuracy}%</div><div className="t-stat-label">Avg Accuracy</div></div>
                        </div>
                        <div className="t-stat-card">
                          <div className="t-stat-icon" style={{ background: '#9B7FFF20', color: '#9B7FFF' }}><ion-icon name="layers"></ion-icon></div>
                          <div><div className="t-stat-value">{teacherStats.overall.total_reviews}</div><div className="t-stat-label">Total Reviews</div></div>
                        </div>
                      </div>

                      {/* Group Performance */}
                      {teacherStats.group_stats.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <h3 className="t-section-title" style={{ fontSize: 14 }}>Group Performance</h3>
                          <div className="t-stats-table">
                            <div className="t-stats-table-header">
                              <span>Group</span>
                              <span>Students</span>
                              <span>Completion</span>
                              <span>Accuracy</span>
                            </div>
                            {teacherStats.group_stats.map((g: any) => (
                              <div key={g.id} className="t-stats-table-row">
                                <span className="t-stats-group-name">
                                  <span className="t-group-dot" style={{ background: g.color }}></span>
                                  {g.name}
                                </span>
                                <span>{g.member_count}</span>
                                <span>
                                  <div className="t-mini-progress" style={{ width: 50 }}>
                                    <div className="t-mini-progress-fill" style={{ width: `${g.completion_rate}%`, background: g.completion_rate >= 70 ? '#10B981' : g.completion_rate >= 40 ? '#F59E0B' : '#EF4444' }}></div>
                                  </div>
                                  <span className="t-pct">{g.completion_rate}%</span>
                                </span>
                                <span className={`t-accuracy-badge ${g.avg_accuracy >= 80 ? 'good' : g.avg_accuracy >= 60 ? 'mid' : 'low'}`}>
                                  {g.avg_accuracy}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Top Students (compact) */}
                      {teacherStats.top_students.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <h3 className="t-section-title" style={{ fontSize: 14 }}>Top Students</h3>
                          <div className="t-leaderboard">
                            {teacherStats.top_students.slice(0, 5).map((s: any, i: number) => (
                              <div key={s.id} className={`t-leaderboard-item ${i < 3 ? 'top-' + (i + 1) : ''}`}>
                                <span className="t-lb-rank">{`#${i + 1}`}</span>
                                <div className="t-lb-avatar">
                                  {s.avatar_url ? (
                                    <img src={s.avatar_url} alt="" />
                                  ) : (
                                    <span>{(s.name || "?").charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="t-lb-info">
                                  <div className="t-lb-name">{s.name}</div>
                                  <div className="t-lb-meta">{s.completed_tasks}/{s.total_tasks} tasks · {s.avg_accuracy}%</div>
                                </div>
                                <div className="t-lb-xp"><ion-icon name="flash" style={{ fontSize: 14 }}></ion-icon> {s.total_xp} XP</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* View full statistics link */}
                      <button className="t-btn t-btn-outline" onClick={() => setActiveTab("statistics")} style={{ marginTop: 16 }}>
                        <ion-icon name="analytics-outline"></ion-icon> View Full Statistics
                      </button>
                    </>
                  ) : (
                    <div className="t-empty-state" style={{ padding: 24 }}>
                      <p style={{ color: 'var(--t-text-muted)' }}>Statistics will appear once students join and start studying.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="t-content">
                <div className="t-page-header">
                  <h1>Settings</h1>
                  <p className="t-subtitle">Manage your account and preferences</p>
                </div>

                {/* Account */}
                <div className="t-section">
                  <h2 className="t-section-title">Account</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-account">
                      <div className="t-user-avatar" style={{ width: 48, height: 48, fontSize: 20 }}>
                        {user.user_metadata?.avatar_url ? (
                          <img src={user.user_metadata.avatar_url} alt="" />
                        ) : (
                          <span>{(user.user_metadata?.full_name || user.email || "T").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="t-settings-account-name">{user.user_metadata?.full_name || user.email?.split("@")[0]}</div>
                        <div className="t-settings-account-email">{user.email}</div>
                        <div className="t-settings-account-role">Role: {role?.toUpperCase()}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <button className="t-btn t-btn-danger" onClick={signOut}>
                        <ion-icon name="log-out-outline"></ion-icon>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>

                {/* Profile Editing Section — moved from Profile tab */}
                <div className="t-section">
                  <h2 className="t-section-title">Edit Profile</h2>
                  <div className="t-settings-card">
                    <form onSubmit={saveProfile} className="t-profile-form">
                      <div className="t-form-row">
                        <div className="t-form-group">
                          <label>Display Name *</label>
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your full name" maxLength={100} required />
                        </div>
                        <div className="t-form-group">
                          <label>Username</label>
                          <input type="text" value={editNickname} onChange={e => setEditNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))} placeholder="username" maxLength={50} />
                          <span className="t-form-hint">{editNickname ? `anki.sodops.uz/profile/${editNickname}` : 'Set a username for your public profile URL'}</span>
                        </div>
                      </div>
                      <div className="t-form-group">
                        <label>Bio</label>
                        <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Tell your students about yourself, your teaching experience..." rows={3} maxLength={500} />
                        <span className="t-char-count">{editBio.length}/500</span>
                      </div>
                      <div className="t-form-row">
                        <div className="t-form-group">
                          <label>Phone</label>
                          <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+998 90 123 45 67" maxLength={20} />
                        </div>
                        <div className="t-form-group">
                          <label>Avatar URL</label>
                          <input type="url" value={editAvatar} onChange={e => setEditAvatar(e.target.value)} placeholder="https://example.com/avatar.jpg" />
                          <span className="t-form-hint">Paste a link to your profile picture</span>
                        </div>
                      </div>
                      <button type="submit" className="t-btn t-btn-primary" disabled={savingProfile} style={{ marginTop: 8 }}>
                        {savingProfile ? "Saving..." : "Save Profile"}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Study Preferences */}
                <div className="t-section">
                  <h2 className="t-section-title">Study Preferences</h2>
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
                        <div className="t-settings-sublabel">Max new cards introduced daily</div>
                      </div>
                      <input type="number" className="t-settings-input" value={settings.newCardsPerDay} min={0} max={100} onChange={e => updateSetting('newCardsPerDay', Number(e.target.value))} />
                    </div>
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Max Reviews / Day</div>
                        <div className="t-settings-sublabel">Max review cards per session</div>
                      </div>
                      <input type="number" className="t-settings-input" value={settings.maxReviews} min={10} max={500} onChange={e => updateSetting('maxReviews', Number(e.target.value))} />
                    </div>
                  </div>
                </div>

                {/* Appearance */}
                <div className="t-section">
                  <h2 className="t-section-title">Appearance</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Theme</div>
                        <div className="t-settings-sublabel">Light or dark mode</div>
                      </div>
                      <button className="t-btn t-btn-outline" onClick={() => {
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
                        <div className="t-settings-sublabel">Adjust flashcard text size</div>
                      </div>
                      <input type="range" value={settings.cardFontSize} min={16} max={64} style={{ width: 120 }} onChange={e => {
                        const val = Number(e.target.value);
                        updateSetting('cardFontSize', val);
                        document.documentElement.style.setProperty('--card-font-size', val + 'px');
                      }} />
                    </div>
                  </div>
                </div>

                {/* Audio & TTS */}
                <div className="t-section">
                  <h2 className="t-section-title">Audio & TTS</h2>
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

                {/* Notifications */}
                <div className="t-section">
                  <h2 className="t-section-title">Notifications</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Study Reminders</div>
                        <div className="t-settings-sublabel">Get notified when it&apos;s time to review</div>
                      </div>
                      <label className="t-toggle"><input type="checkbox" checked={settings.studyReminders} onChange={e => updateSetting('studyReminders', e.target.checked)} /><span className="t-toggle-slider"></span></label>
                    </div>
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Assignment Updates</div>
                        <div className="t-settings-sublabel">Notify on student completions</div>
                      </div>
                      <label className="t-toggle"><input type="checkbox" checked={settings.assignmentUpdates} onChange={e => updateSetting('assignmentUpdates', e.target.checked)} /><span className="t-toggle-slider"></span></label>
                    </div>
                  </div>
                </div>

                {/* Algorithm */}
                <div className="t-section">
                  <h2 className="t-section-title">Algorithm</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Spaced Repetition</div>
                        <div className="t-settings-sublabel">Choose between SM-2 and FSRS</div>
                      </div>
                      <select className="t-settings-select" value={settings.algorithm} onChange={e => updateSetting('algorithm', e.target.value)}>
                        <option value="sm-2">SM-2 (Classic)</option>
                        <option value="fsrs">FSRS (Modern)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Data */}
                <div className="t-section">
                  <h2 className="t-section-title">Data Management</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Export data</div>
                        <div className="t-settings-sublabel">Download decks as JSON</div>
                      </div>
                      <a href="/api/backup/export" className="t-btn t-btn-outline t-btn-sm">
                        <ion-icon name="download-outline"></ion-icon> Export
                      </a>
                    </div>
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Import data</div>
                        <div className="t-settings-sublabel">Restore from backup</div>
                      </div>
                      <a href="/app" className="t-btn t-btn-outline t-btn-sm">
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

      {/* Confirm Modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002 }} onClick={() => setConfirmModal(null)}>
          <div style={{ background: 'var(--card-bg, #1a1a2e)', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, color: 'var(--text, #fff)' }}>Confirm</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary, #9ca3af)', lineHeight: 1.5 }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border, #2a2a3a)', background: 'transparent', color: 'var(--text, #fff)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="t-bottom-nav">
        <button className={`t-bottom-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <ion-icon name="grid-outline"></ion-icon>
          <span>Home</span>
        </button>
        <button className={`t-bottom-nav-item ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
          <ion-icon name="people-outline"></ion-icon>
          <span>Groups</span>
        </button>
        <button className={`t-bottom-nav-item ${activeTab === 'create-assignment' ? 'active' : ''}`} onClick={() => setActiveTab('create-assignment')}>
          <ion-icon name="add-circle-outline"></ion-icon>
          <span>New Task</span>
        </button>
        <button className={`t-bottom-nav-item ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')} style={{ position: 'relative' }}>
          <ion-icon name="mail-outline"></ion-icon>
          <span>Inbox</span>
          {(inboxRequests.length + inboxUnread) > 0 && <span style={{ position: 'absolute', top: 4, right: '50%', marginRight: -16, width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }}></span>}
        </button>
        <button className={`t-bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <ion-icon name="settings-outline"></ion-icon>
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
