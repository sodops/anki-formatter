"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  join_code: string;
  color: string;
  max_members: number;
  is_active: boolean;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    total_xp: number;
    current_streak: number;
  };
}

interface ProgressEntry {
  student_id: string;
  status: string;
  cards_total: number;
  cards_studied: number;
  cards_mastered: number;
  accuracy: number;
  total_reviews: number;
  time_spent_seconds: number;
  completed_at: string | null;
  last_studied_at: string | null;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  xp_reward: number;
  assignment_decks: { id: string; deck_name: string; card_count: number }[];
  progress: ProgressEntry[];
  created_at: string;
}

export default function GroupDetailPage({ params }: { params: { id: string } }) {
  const groupId = params.id;
  const { user, loading: authLoading } = useAuth();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"members" | "assignments" | "statistics" | "activity" | "info">("members");
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm });
  };

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setGroup(data.group);
      setMembers(data.members || []);
      setAssignments(data.assignments || []);
      setIsOwner(data.isOwner);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!authLoading && user) fetchGroup();
  }, [authLoading, user, fetchGroup]);

  const removeMember = async (userId: string) => {
    showConfirm("Remove this member from the group?", async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
        if (res.ok) {
          showToast('success', 'Member removed');
          fetchGroup();
        }
      } catch {
        showToast('error', 'Failed to remove member');
      }
    });
  };

  const copyJoinCode = () => {
    if (group?.join_code) {
      navigator.clipboard.writeText(group.join_code);
      showToast('success', 'Join code copied!');
    }
  };

  const copyJoinLink = () => {
    if (group?.join_code && typeof window !== 'undefined') {
      const link = `${window.location.origin}/login?join=${group.join_code}`;
      navigator.clipboard.writeText(link);
      showToast('success', 'Invite link copied!');
    }
  };

  const getRecentActivity = () => {
    if (!assignments.length || !members.length) return [];
    const activities: { student: string; action: string; assignment: string; date: string; icon: string; color: string }[] = [];
    for (const a of assignments) {
      for (const p of (a.progress || [])) {
        const student = members.find(m => m.user_id === p.student_id);
        const name = student?.profiles?.display_name || 'Unknown';
        if (p.completed_at) {
          activities.push({ student: name, action: 'completed', assignment: a.title, date: p.completed_at, icon: 'checkmark-circle', color: '#10B981' });
        } else if (p.last_studied_at) {
          activities.push({ student: name, action: 'studied', assignment: a.title, date: p.last_studied_at, icon: 'book-outline', color: '#7C5CFC' });
        }
      }
    }
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  };

  if (authLoading || loading) {
    return (
      <div className="teacher-container">
        <div className="teacher-mobile-back">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #94a3b8)', fontSize: '14px' }}>
            <Skeleton width={20} height={20} borderRadius="50%" />
            <Skeleton width={120} height="0.875rem" />
          </span>
        </div>

        <aside className="teacher-sidebar">
          <div className="teacher-sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
              <Skeleton width={28} height={28} borderRadius={8} />
              <Skeleton width={80} height="1rem" />
            </div>
          </div>
          <nav className="teacher-nav" style={{ padding: '12px' }}>
            <Skeleton width="100%" height="2.25rem" borderRadius={8} />
            <div style={{ marginTop: '8px' }}><Skeleton width="100%" height="2.25rem" borderRadius={8} /></div>
            <div style={{ marginTop: '8px' }}><Skeleton width="100%" height="2.25rem" borderRadius={8} /></div>
            <div style={{ marginTop: '8px' }}><Skeleton width="100%" height="2.25rem" borderRadius={8} /></div>
          </nav>
        </aside>

        <main className="teacher-main" style={{ padding: '2rem' }}>
          {/* Group name + description */}
          <div style={{ marginBottom: '1.5rem', paddingLeft: '16px', borderLeft: '4px solid var(--border, #333)' }}>
            <Skeleton width="45%" height="1.75rem" />
            <div style={{ marginTop: '0.5rem' }}><Skeleton width="60%" height="0.875rem" /></div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ background: 'var(--card-bg, var(--bg-elevated, #1a1a25))', border: '1px solid var(--border, rgba(255,255,255,0.08))', borderRadius: 12, padding: '1.25rem', textAlign: 'center' }}>
                <Skeleton width="50%" height="1.5rem" borderRadius={6} />
                <div style={{ marginTop: '0.5rem' }}><Skeleton width="70%" height="0.75rem" /></div>
              </div>
            ))}
          </div>

          {/* Tabs skeleton */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[1,2,3].map(i => <Skeleton key={i} width={80} height="2rem" borderRadius={8} />)}
          </div>

          {/* Member cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ padding: '1.25rem', background: 'var(--card-bg, var(--bg-elevated, #1a1a25))', border: '1px solid var(--border, rgba(255,255,255,0.08))', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Skeleton width={40} height={40} borderRadius="50%" />
                  <div style={{ flex: 1 }}>
                    <Skeleton width={100} height="1rem" />
                    <div style={{ marginTop: '0.5rem' }}><Skeleton width={60} height="0.75rem" /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="teacher-loading">
        <h2>Group not found</h2>
        <Link href="/teacher" style={{ color: "#7C5CFC" }}>← Back to Dashboard</Link>
      </div>
    );
  }

  const students = members.filter(m => m.role === "student");
  const teachers = members.filter(m => m.role === "teacher");

  return (
    <div className="teacher-container">
      {/* Mobile Back Header */}
      <div className="teacher-mobile-back">
        <Link href="/teacher">
          <ion-icon name="arrow-back-outline"></ion-icon>
          Back to Dashboard
        </Link>
      </div>

      <aside className="teacher-sidebar">
        <div className="teacher-sidebar-header">
          <Link href="/teacher" className="teacher-logo">
            <span className="teacher-logo-icon"><ion-icon name="flash"></ion-icon></span>
            <span>AnkiFlow</span>
          </Link>
        </div>
        <nav className="teacher-nav">
          <Link href="/teacher" className="teacher-nav-item">
            <ion-icon name="arrow-back-outline"></ion-icon>
            <span>Back to Dashboard</span>
          </Link>
          <hr className="teacher-nav-divider" />
          <button className={`teacher-nav-item ${activeTab === "members" ? "active" : ""}`} onClick={() => setActiveTab("members")}>
            <ion-icon name="people-outline"></ion-icon>
            <span>Members</span>
            <span className="teacher-nav-count">{members.length}</span>
          </button>
          <button className={`teacher-nav-item ${activeTab === "assignments" ? "active" : ""}`} onClick={() => setActiveTab("assignments")}>
            <ion-icon name="document-text-outline"></ion-icon>
            <span>Assignments</span>
            <span className="teacher-nav-count">{assignments.length}</span>
          </button>
          <button className={`teacher-nav-item ${activeTab === "statistics" ? "active" : ""}`} onClick={() => setActiveTab("statistics")}>
            <ion-icon name="stats-chart-outline"></ion-icon>
            <span>Statistics</span>
          </button>
          <button className={`teacher-nav-item ${activeTab === "activity" ? "active" : ""}`} onClick={() => setActiveTab("activity")}>
            <ion-icon name="pulse-outline"></ion-icon>
            <span>Activity</span>
          </button>
          <button className={`teacher-nav-item ${activeTab === "info" ? "active" : ""}`} onClick={() => setActiveTab("info")}>
            <ion-icon name="information-circle-outline"></ion-icon>
            <span>Group Info</span>
          </button>
        </nav>
      </aside>

      <main className="teacher-main">
        {/* Group Header */}
        <div className="teacher-group-header" style={{ borderLeft: `4px solid ${group.color}` }}>
          <div>
            <h1>{group.name}</h1>
            {group.description && <p>{group.description}</p>}
          </div>
          <div className="teacher-join-code-large">
            <span>Join Code:</span>
            <code>{group.join_code}</code>
            <button className="teacher-btn teacher-btn-outline teacher-btn-sm" onClick={copyJoinCode}>
              <ion-icon name="copy-outline"></ion-icon> Copy
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button className="teacher-btn teacher-btn-outline teacher-btn-sm" onClick={copyJoinLink}>
            <ion-icon name="link-outline"></ion-icon> Share Invite Link
          </button>
          <Link href={`/teacher?tab=create&group=${groupId}`} className="teacher-btn teacher-btn-primary teacher-btn-sm">
            <ion-icon name="add-outline"></ion-icon> New Assignment
          </Link>
          <button className="teacher-btn teacher-btn-outline teacher-btn-sm" onClick={copyJoinCode}>
            <ion-icon name="key-outline"></ion-icon> Copy Code
          </button>
        </div>

        {/* Quick Stats */}
        <div className="teacher-stats-row">
          <div className="teacher-stat-card">
            <div className="teacher-stat-value">{students.length}</div>
            <div className="teacher-stat-label">Students</div>
          </div>
          <div className="teacher-stat-card">
            <div className="teacher-stat-value">{assignments.length}</div>
            <div className="teacher-stat-label">Assignments</div>
          </div>
          <div className="teacher-stat-card">
            <div className="teacher-stat-value">
              {students.length > 0 
                ? Math.round(students.reduce((sum, s) => sum + (s.profiles?.total_xp || 0), 0) / students.length)
                : 0}
            </div>
            <div className="teacher-stat-label">Avg XP</div>
          </div>
          <div className="teacher-stat-card">
            <div className="teacher-stat-value">
              {students.length > 0
                ? (students.reduce((sum, s) => sum + (s.profiles?.current_streak || 0), 0) / students.length).toFixed(1)
                : 0}
            </div>
            <div className="teacher-stat-label">Avg Streak</div>
          </div>
        </div>

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="teacher-section">
            <h2>Members ({members.length})</h2>

            {teachers.length > 0 && (
              <>
                <h3 className="teacher-subsection-title">Teachers</h3>
                <div className="teacher-member-list">
                  {teachers.map(m => (
                    <Link key={m.id} href={`/profile/${m.user_id}`} className="teacher-member-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="teacher-member-avatar">
                        {m.profiles?.avatar_url
                          ? <img src={m.profiles.avatar_url} alt="" />
                          : <span>{(m.profiles?.display_name || "?")[0].toUpperCase()}</span>}
                      </div>
                      <div className="teacher-member-info">
                        <span className="teacher-member-name">{m.profiles?.display_name || "Unknown"}</span>
                        <span className="teacher-member-role">Teacher</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            <h3 className="teacher-subsection-title">Students ({students.length})</h3>
            {students.length === 0 ? (
              <div className="teacher-empty-inline">
                <p>No students yet. Share the join code <code>{group.join_code}</code> with your students.</p>
              </div>
            ) : (
              <div className="teacher-member-list">
                {students.map(m => (
                  <div key={m.id} className="teacher-member-card">
                    <Link href={`/profile/${m.user_id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, textDecoration: 'none', color: 'inherit' }}>
                      <div className="teacher-member-avatar">
                        {m.profiles?.avatar_url
                          ? <img src={m.profiles.avatar_url} alt="" />
                          : <span>{(m.profiles?.display_name || "?")[0].toUpperCase()}</span>}
                      </div>
                      <div className="teacher-member-info">
                        <span className="teacher-member-name">{m.profiles?.display_name || "Unknown"}</span>
                        <div className="teacher-member-stats">
                          <span><ion-icon name="flash-outline" style={{ fontSize: '12px' }}></ion-icon> {m.profiles?.total_xp || 0} XP</span>
                          <span><ion-icon name="flame-outline" style={{ fontSize: '12px' }}></ion-icon> {m.profiles?.current_streak || 0} day streak</span>
                        </div>
                      </div>
                    </Link>
                    {isOwner && m.user_id !== user?.id && (
                      <button className="teacher-btn-icon teacher-btn-danger" onClick={() => removeMember(m.user_id)} title="Remove">
                        <ion-icon name="close-outline"></ion-icon>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === "assignments" && (
          <div className="teacher-section">
            <div className="teacher-section-header">
              <h2>Assignments ({assignments.length})</h2>
              <Link href={`/teacher?tab=create&group=${groupId}`} className="teacher-btn teacher-btn-primary teacher-btn-sm">
                <ion-icon name="add-outline"></ion-icon> New Assignment
              </Link>
            </div>

            {assignments.length === 0 ? (
              <div className="teacher-empty-inline">
                <p>No assignments yet for this group.</p>
              </div>
            ) : (
              assignments.map(assignment => {
                const totalStudents = assignment.progress?.length || 0;
                const completed = assignment.progress?.filter(p => p.status === "completed").length || 0;
                const inProgress = assignment.progress?.filter(p => p.status === "in_progress").length || 0;
                const avgAccuracy = totalStudents > 0
                  ? Math.round(assignment.progress.reduce((sum, p) => sum + (p.accuracy || 0), 0) / totalStudents)
                  : 0;

                return (
                  <div key={assignment.id} className="teacher-assignment-detail">
                    <div className="teacher-assignment-header">
                      <div>
                        <h3>{assignment.title}</h3>
                        {assignment.deadline && (
                          <span className={`teacher-deadline ${new Date(assignment.deadline) < new Date() ? "overdue" : ""}`}>
                            <ion-icon name="time-outline"></ion-icon>
                            Due: {new Date(assignment.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <span className="teacher-xp-badge">+{assignment.xp_reward} XP</span>
                    </div>

                    <div className="teacher-assignment-decks" style={{ marginBottom: "12px" }}>
                      {assignment.assignment_decks?.map(d => (
                        <span key={d.id} className="teacher-deck-chip">
                          {d.deck_name} ({d.card_count})
                        </span>
                      ))}
                    </div>

                    {/* Student Progress Table */}
                    {assignment.progress?.length > 0 && (
                      <table className="teacher-progress-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Status</th>
                            <th>Progress</th>
                            <th>Accuracy</th>
                            <th>Reviews</th>
                            <th>Last Studied</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignment.progress.map(p => {
                            const student = students.find(s => s.user_id === p.student_id);
                            const progressPct = p.cards_total > 0 ? Math.round((p.cards_studied / p.cards_total) * 100) : 0;
                            return (
                              <tr key={p.student_id}>
                                <td>{student?.profiles?.display_name || "Unknown"}</td>
                                <td>
                                  <span className={`teacher-status-badge status-${p.status}`}>
                                    {p.status.replace("_", " ")}
                                  </span>
                                </td>
                                <td>
                                  <div className="teacher-mini-progress">
                                    <div className="teacher-mini-bar">
                                      <div style={{ width: `${progressPct}%` }}></div>
                                    </div>
                                    <span>{p.cards_studied}/{p.cards_total}</span>
                                  </div>
                                </td>
                                <td>{p.accuracy ? `${Math.round(p.accuracy)}%` : "—"}</td>
                                <td>{p.total_reviews}</td>
                                <td>{p.last_studied_at ? new Date(p.last_studied_at).toLocaleDateString() : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    <div className="teacher-assignment-summary">
                      <span>Completed: {completed}/{totalStudents}</span>
                      <span>In Progress: {inProgress}</span>
                      {avgAccuracy > 0 && <span>Avg Accuracy: {avgAccuracy}%</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === "statistics" && (
          <div className="teacher-section">
            <h2>Group Statistics</h2>

            {students.length === 0 ? (
              <div className="teacher-empty-inline">
                <p>No students yet. Statistics will appear once students join.</p>
              </div>
            ) : (
              <>
                {/* XP Leaderboard */}
                <div className="t-chart-card">
                  <h3 className="t-chart-title"><ion-icon name="trophy-outline" style={{ marginRight: '8px', color: '#F59E0B' }}></ion-icon> XP Leaderboard</h3>
                  <div className="t-bar-chart">
                    {[...students]
                      .sort((a, b) => (b.profiles?.total_xp || 0) - (a.profiles?.total_xp || 0))
                      .map((s, i) => {
                        const maxXP = Math.max(...students.map(st => st.profiles?.total_xp || 0), 1);
                        const xpVal = s.profiles?.total_xp || 0;
                        const colors = ['#F59E0B', '#9CA3AF', '#CD7F32', '#7C5CFC', '#3B82F6', '#10B981', '#9B7FFF', '#EC4899'];
                        return (
                          <div className="t-bar-row" key={s.id}>
                            <span className="t-bar-rank">{`${i + 1}.`}</span>
                            <span className="t-bar-label">{s.profiles?.display_name || 'Unknown'}</span>
                            <div className="t-bar-track">
                              <div className="t-bar-fill" style={{ width: `${(xpVal / maxXP) * 100}%`, background: colors[i % colors.length] }}></div>
                            </div>
                            <span className="t-bar-value">{xpVal} XP</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Streak Comparison */}
                <div className="t-chart-card">
                  <h3 className="t-chart-title"><ion-icon name="flame-outline" style={{ marginRight: '8px', color: '#F59E0B' }}></ion-icon> Streak Comparison</h3>
                  <div className="t-bar-chart">
                    {[...students]
                      .sort((a, b) => (b.profiles?.current_streak || 0) - (a.profiles?.current_streak || 0))
                      .map(s => {
                        const maxStreak = Math.max(...students.map(st => st.profiles?.current_streak || 0), 1);
                        const streak = s.profiles?.current_streak || 0;
                        return (
                          <div className="t-bar-row" key={s.id}>
                            <span className="t-bar-label">{s.profiles?.display_name || 'Unknown'}</span>
                            <div className="t-bar-track">
                              <div className="t-bar-fill" style={{ width: `${(streak / maxStreak) * 100}%`, background: streak > 0 ? '#F59E0B' : '#4B5563' }}></div>
                            </div>
                            <span className="t-bar-value">{streak}d</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Assignment Completion Overview */}
                {assignments.length > 0 && (
                  <div className="t-chart-card">
                    <h3 className="t-chart-title"><ion-icon name="bar-chart-outline" style={{ marginRight: '8px', color: '#7C5CFC' }}></ion-icon> Assignment Completion</h3>
                    <div className="t-bar-chart">
                      {assignments.map(a => {
                        const total = students.length || 1;
                        const completed = a.progress?.filter(p => p.status === "completed").length || 0;
                        const pct = Math.round((completed / total) * 100);
                        const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
                        return (
                          <div className="t-bar-row" key={a.id}>
                            <span className="t-bar-label" title={a.title}>{a.title.length > 20 ? a.title.slice(0, 20) + '…' : a.title}</span>
                            <div className="t-bar-track">
                              <div className="t-bar-fill" style={{ width: `${pct}%`, background: color }}></div>
                            </div>
                            <span className="t-bar-value">{completed}/{total}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Per-Student Assignment Progress */}
                {assignments.length > 0 && (
                  <div className="t-chart-card">
                    <h3 className="t-chart-title"><ion-icon name="people-outline" style={{ marginRight: '8px', color: '#9B7FFF' }}></ion-icon> Student Progress Summary</h3>
                    <div className="t-student-grid">
                      {students.map(s => {
                        const studentProgress = assignments.flatMap(a =>
                          (a.progress || []).filter(p => p.student_id === s.user_id)
                        );
                        const totalAssignments = assignments.length;
                        const completedCount = studentProgress.filter(p => p.status === "completed").length;
                        const avgAccuracy = studentProgress.length > 0
                          ? Math.round(studentProgress.reduce((sum, p) => sum + (p.accuracy || 0), 0) / studentProgress.length)
                          : 0;
                        const totalReviews = studentProgress.reduce((sum, p) => sum + (p.total_reviews || 0), 0);

                        return (
                          <div key={s.id} className="t-student-stat-card">
                            <div className="t-student-stat-header">
                              <div className="t-student-stat-avatar">
                                {s.profiles?.avatar_url
                                  ? <img src={s.profiles.avatar_url} alt="" />
                                  : <span>{(s.profiles?.display_name || '?')[0].toUpperCase()}</span>}
                              </div>
                              <div>
                                <div className="t-student-stat-name">{s.profiles?.display_name || 'Unknown'}</div>
                                <div className="t-student-stat-xp"><ion-icon name="flash-outline" style={{ fontSize: '12px' }}></ion-icon> {s.profiles?.total_xp || 0} XP · <ion-icon name="flame-outline" style={{ fontSize: '12px' }}></ion-icon> {s.profiles?.current_streak || 0}d</div>
                              </div>
                            </div>
                            <div className="t-student-stat-metrics">
                              <div className="t-student-metric">
                                <span className="t-student-metric-val">{completedCount}/{totalAssignments}</span>
                                <span className="t-student-metric-label">Tasks Done</span>
                              </div>
                              <div className="t-student-metric">
                                <span className="t-student-metric-val">{avgAccuracy}%</span>
                                <span className="t-student-metric-label">Accuracy</span>
                              </div>
                              <div className="t-student-metric">
                                <span className="t-student-metric-val">{totalReviews}</span>
                                <span className="t-student-metric-label">Reviews</span>
                              </div>
                            </div>
                            <div className="t-student-progress-bar">
                              <div className="t-student-progress-fill" style={{ width: `${totalAssignments > 0 ? (completedCount / totalAssignments) * 100 : 0}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {/* Activity Tab */}
        {activeTab === "activity" && (() => {
          const activities = getRecentActivity();
          return (
            <div className="teacher-section">
              <h2>Recent Activity</h2>
              {activities.length === 0 ? (
                <div className="teacher-empty-inline">
                  <p>No activity yet. Activity will appear as students study assignments.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activities.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ion-icon name={a.icon} style={{ fontSize: 16, color: a.color }}></ion-icon>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary, #1e293b)' }}>
                          <strong>{a.student}</strong> {a.action} <span style={{ color: '#7C5CFC' }}>{a.assignment}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {new Date(a.date).toLocaleDateString()} · {new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Info Tab */}
        {activeTab === "info" && (
          <div className="teacher-section">
            <h2>Group Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '18px' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>Group Name</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>{group.name}</div>
              </div>
              <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '18px' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>Created</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>{new Date(group.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '18px' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>Max Members</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>{group.max_members}</div>
              </div>
              <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '18px' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>Status</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: group.is_active ? '#10B981' : '#EF4444' }}>{group.is_active ? 'Active' : 'Inactive'}</div>
              </div>
              <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '18px' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>Join Code</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#7C5CFC', letterSpacing: 2, fontFamily: 'monospace' }}>{group.join_code}</div>
              </div>
              <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '18px' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>Color</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: group.color }}></div>
                  <span style={{ fontSize: 14, color: 'var(--text-primary, #1e293b)' }}>{group.color}</span>
                </div>
              </div>
            </div>

            {group.description && (
              <div style={{ marginTop: 18, background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '18px' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>Description</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary, #1e293b)', lineHeight: 1.6 }}>{group.description}</div>
              </div>
            )}

            <div style={{ marginTop: 18, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="teacher-btn teacher-btn-outline teacher-btn-sm" onClick={copyJoinLink}>
                <ion-icon name="link-outline"></ion-icon> Share Invite Link
              </button>
              <button className="teacher-btn teacher-btn-outline teacher-btn-sm" onClick={copyJoinCode}>
                <ion-icon name="key-outline"></ion-icon> Copy Join Code
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 10001, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 12, background: toast.type === 'error' ? '#FEE2E2' : toast.type === 'success' ? '#D1FAE5' : '#DBEAFE', color: toast.type === 'error' ? '#DC2626' : toast.type === 'success' ? '#059669' : '#2563EB', fontSize: 14, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <ion-icon name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'close-circle' : 'information-circle'}></ion-icon>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002 }} onClick={() => setConfirmModal(null)}>
          <div style={{ background: 'var(--card-bg, #1a1a2e)', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, color: 'var(--text, #fff)' }}>Confirm</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary, #9ca3af)' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border, #2a2a3a)', background: 'transparent', color: 'var(--text, #fff)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
