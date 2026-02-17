"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

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
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444",
  "#F59E0B", "#10B981", "#06B6D4", "#3B82F6",
];

export default function TeacherDashboard() {
  const { user, loading, role, signOut } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"overview" | "groups" | "assignments" | "create-group" | "create-assignment" | "settings">("overview");
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

  // Copy join code handler
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess("Join code copied!");
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
        const allDecks = sd.data?.decks || sd.decks || [];
        setDecks(allDecks.map((d: any) => ({ id: d.id, name: d.name, cards_count: d.cards?.length || d.cards_count || 0 })));
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
    if (!confirm("Delete this group? All assignments and progress will be lost.")) return;
    try {
      await fetch(`/api/groups/${id}`, { method: "DELETE" });
      fetchData();
    } catch {}
  };

  if (loading) {
    return (
      <div className="t-loading">
        <div className="t-spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!user || (role !== "teacher" && role !== "admin")) {
    return (
      <div className="t-loading">
        <h2>Access Denied</h2>
        <p>This page is only for teachers.</p>
        <a href="/student" className="t-btn t-btn-primary">Go to Student Hub</a>
      </div>
    );
  }

  const totalStudents = groups.reduce((s, g) => s + (g.member_count - 1), 0);
  const activeAssignments = assignments.filter(a => a.status === "active").length;
  const overdueCount = assignments.filter(a => a.deadline && new Date(a.deadline) < new Date() && a.status === "active").length;

  return (
    <div className="t-dashboard">
      {/* Sidebar */}
      <aside className="t-sidebar">
        <div className="t-brand">
          <span className="t-brand-icon">⚡</span>
          <span className="t-brand-name">AnkiFlow</span>
          <span className="t-role-tag">Teacher</span>
        </div>

        <nav className="t-nav">
          <button className={`t-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <ion-icon name="grid-outline"></ion-icon>
            <span>Overview</span>
          </button>
          <button className={`t-nav-item ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
            <ion-icon name="people-outline"></ion-icon>
            <span>Groups</span>
            {groups.length > 0 && <span className="t-nav-count">{groups.length}</span>}
          </button>
          <button className={`t-nav-item ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>
            <ion-icon name="document-text-outline"></ion-icon>
            <span>Assignments</span>
            {activeAssignments > 0 && <span className="t-nav-count">{activeAssignments}</span>}
          </button>
        </nav>

        <div className="t-nav-divider"></div>

        <nav className="t-nav">
          <button className={`t-nav-item ${activeTab === 'create-group' ? 'active' : ''}`} onClick={() => setActiveTab('create-group')}>
            <ion-icon name="add-circle-outline"></ion-icon>
            <span>New Group</span>
          </button>
          <button className={`t-nav-item ${activeTab === 'create-assignment' ? 'active' : ''}`} onClick={() => setActiveTab('create-assignment')}>
            <ion-icon name="create-outline"></ion-icon>
            <span>New Assignment</span>
          </button>
        </nav>

        <div className="t-nav-divider"></div>
        
        <nav className="t-nav">
          <a href="/app/study" className="t-nav-item">
            <ion-icon name="flash-outline"></ion-icon>
            <span>Study Cards</span>
          </a>
          <button className={`t-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
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
                    <h1>Welcome back, {user.user_metadata?.full_name || user.email?.split("@")[0] || "Teacher"} 👋</h1>
                    <p className="t-subtitle">Here&apos;s what&apos;s happening with your classes</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="t-stats-row">
                  <div className="t-stat-card">
                    <div className="t-stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
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
                      <span>Study Cards</span>
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
                        <Link href={`/teacher/groups/${g.id}`} key={g.id} className="t-group-card" style={{ borderTopColor: g.color }}>
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
                              <span className="t-assign-dot" style={{ background: a.group_color || '#6366F1' }}></span>
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
                                  <span className="t-assign-xp">⚡ {a.xp_reward} XP</span>
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
                    <div className="t-empty-icon">📚</div>
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
                    <div className="t-empty-icon">👥</div>
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
                        <div className="t-group-actions">
                          <Link href={`/teacher/groups/${g.id}`} className="t-btn t-btn-sm t-btn-outline">
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
                    <div className="t-empty-icon">📝</div>
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
                                  <span className="t-group-chip" style={{ background: a.group_color || '#6366F1' }}>{a.group_name}</span>
                                )}
                                {a.deadline && (
                                  <span className={`t-assign-deadline ${isOverdue ? 'overdue' : ''}`}>
                                    <ion-icon name="time-outline"></ion-icon>
                                    {isOverdue ? 'Overdue: ' : 'Due: '}{new Date(a.deadline).toLocaleDateString()}
                                  </span>
                                )}
                                <span className="t-assign-xp">⚡ {a.xp_reward} XP</span>
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
                    <div className="t-empty-icon">⚠️</div>
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
                              No decks available. Go to <Link href="/app" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Study Cards</Link> to create or import decks first.
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
            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="t-content">
                <div className="t-page-header">
                  <h1>Settings</h1>
                  <p className="t-subtitle">Manage your account and preferences</p>
                </div>

                {/* Account Info */}
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
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{user.user_metadata?.full_name || user.email?.split("@")[0]}</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>{user.email}</div>
                        <div style={{ fontSize: 12, color: '#6366F1', fontWeight: 600, marginTop: 2 }}>Role: {role?.toUpperCase()}</div>
                      </div>
                    </div>
                    <button className="t-btn t-btn-danger" onClick={signOut} style={{ marginTop: 16 }}>
                      <ion-icon name="log-out-outline"></ion-icon>
                      Sign Out
                    </button>
                  </div>
                </div>

                {/* Appearance */}
                <div className="t-section">
                  <h2 className="t-section-title">Appearance</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Theme</div>
                        <div className="t-settings-sublabel">Choose light or dark mode</div>
                      </div>
                      <button className="t-btn t-btn-outline" onClick={() => {
                        if (typeof window !== "undefined" && (window as any).toggleTheme) {
                          (window as any).toggleTheme();
                        }
                      }}>
                        <ion-icon name="sunny-outline"></ion-icon>
                        Toggle Theme
                      </button>
                    </div>
                  </div>
                </div>

                {/* Data Management */}
                <div className="t-section">
                  <h2 className="t-section-title">Data</h2>
                  <div className="t-settings-card">
                    <div className="t-settings-row">
                      <div>
                        <div className="t-settings-label">Export all data</div>
                        <div className="t-settings-sublabel">Download all your decks and cards as JSON backup</div>
                      </div>
                      <a href="/api/backup/export" className="t-btn t-btn-outline t-btn-sm">
                        <ion-icon name="download-outline"></ion-icon> Export
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
