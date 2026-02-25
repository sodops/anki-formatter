"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

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
    username?: string;
    nickname?: string;
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
  const { user, loading: authLoading, role } = useAuth();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"members" | "assignments" | "statistics">("members");

  const isTeacher = role === "teacher" || role === "admin";
  const backPath = isTeacher ? "/teacher" : "/student";

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
    if (!confirm("Remove this member from the group?")) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
      if (res.ok) fetchGroup();
    } catch {
      // error
    }
  };

  const copyJoinCode = () => {
    if (group?.join_code) {
      navigator.clipboard.writeText(group.join_code);
    }
  };

  const getMemberProfileUrl = (m: Member) => {
    const username = m.profiles?.username || m.profiles?.nickname;
    if (username) return `/profile/${username}`;
    return `/profile/${m.user_id}`;
  };

  if (authLoading || loading) {
    return (
      <div className="teacher-loading">
        <div className="teacher-spinner"></div>
        <p>Loading group...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="teacher-loading">
        <h2>Group not found</h2>
        <Link href={backPath} style={{ color: "#7C5CFC" }}>← Back to Dashboard</Link>
      </div>
    );
  }

  const students = members.filter(m => m.role === "student");
  const teachers = members.filter(m => m.role === "teacher");

  return (
    <div className="teacher-container">
      {/* Mobile Back Header */}
      <div className="teacher-mobile-back">
        <Link href={backPath}>
          <ion-icon name="arrow-back-outline"></ion-icon>
          Back to Dashboard
        </Link>
      </div>

      <aside className="teacher-sidebar">
        <div className="teacher-sidebar-header">
          <Link href={backPath} className="teacher-logo">
            <span className="teacher-logo-icon"><ion-icon name="flash"></ion-icon></span>
            <span>AnkiFlow</span>
          </Link>
        </div>
        <nav className="teacher-nav">
          <Link href={backPath} className="teacher-nav-item">
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
        </nav>
      </aside>

      <main className="teacher-main">
        {/* Group Header */}
        <div className="teacher-group-header" style={{ borderLeft: `4px solid ${group.color}` }}>
          <div>
            <h1>{group.name}</h1>
            {group.description && <p>{group.description}</p>}
          </div>
          {isOwner && (
            <div className="teacher-join-code-large">
              <span>Join Code:</span>
              <code>{group.join_code}</code>
              <button className="teacher-btn teacher-btn-outline teacher-btn-sm" onClick={copyJoinCode}>
                <ion-icon name="copy-outline"></ion-icon> Copy
              </button>
            </div>
          )}
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
                    <Link key={m.id} href={getMemberProfileUrl(m)} className="teacher-member-card" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                      <div className="teacher-member-avatar">
                        {m.profiles?.avatar_url
                          ? <img src={m.profiles.avatar_url} alt="" />
                          : <span>{(m.profiles?.display_name || "?")[0].toUpperCase()}</span>}
                      </div>
                      <div className="teacher-member-info">
                        <span className="teacher-member-name">{m.profiles?.display_name || "Unknown"}</span>
                        <span className="teacher-member-role">Teacher</span>
                      </div>
                      <ion-icon name="chevron-forward-outline" style={{ color: '#94a3b8', fontSize: '16px' }}></ion-icon>
                    </Link>
                  ))}
                </div>
              </>
            )}

            <h3 className="teacher-subsection-title">Students ({students.length})</h3>
            {students.length === 0 ? (
              <div className="teacher-empty-inline">
                <p>No students yet. {isOwner ? <>Share the join code <code>{group.join_code}</code> with your students.</> : 'Waiting for students to join.'}</p>
              </div>
            ) : (
              <div className="teacher-member-list">
                {students.map(m => (
                  <div key={m.id} className="teacher-member-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href={getMemberProfileUrl(m)} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, textDecoration: 'none', color: 'inherit' }}>
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
                      <button className="teacher-btn-icon teacher-btn-danger" onClick={(e) => { e.preventDefault(); removeMember(m.user_id); }} title="Remove">
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
              {isOwner && (
                <Link href={`/teacher?tab=create&group=${groupId}`} className="teacher-btn teacher-btn-primary teacher-btn-sm">
                  <ion-icon name="add-outline"></ion-icon> New Assignment
                </Link>
              )}
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

                // Find current user's progress
                const myProgress = assignment.progress?.find(p => p.student_id === user?.id);

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="teacher-xp-badge">+{assignment.xp_reward} XP</span>
                        {!isTeacher && (
                          <a href={`/student/study/${assignment.id}`} className="teacher-btn teacher-btn-primary teacher-btn-sm">
                            <ion-icon name={myProgress?.status === 'completed' ? 'eye-outline' : 'play-outline'}></ion-icon>
                            {myProgress?.status === 'completed' ? 'Review' : 'Study'}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="teacher-assignment-decks" style={{ marginBottom: "12px" }}>
                      {assignment.assignment_decks?.map(d => (
                        <span key={d.id} className="teacher-deck-chip">
                          {d.deck_name} ({d.card_count})
                        </span>
                      ))}
                    </div>

                    {/* My Progress (for students) */}
                    {!isTeacher && myProgress && (
                      <div style={{ background: 'var(--bg-card, #f9fafb)', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', border: '1px solid var(--border, #e5e7eb)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                          <span>Your Progress</span>
                          <span className={`teacher-status-badge status-${myProgress.status}`}>{myProgress.status.replace("_", " ")}</span>
                        </div>
                        <div className="teacher-mini-progress" style={{ width: '100%', height: '8px', marginBottom: '8px' }}>
                          <div style={{ width: `${myProgress.cards_total > 0 ? Math.round((myProgress.cards_studied / myProgress.cards_total) * 100) : 0}%`, height: '100%', background: myProgress.status === 'completed' ? '#10B981' : 'linear-gradient(90deg, #7C5CFC, #9B7FFF)', borderRadius: '4px' }}></div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                          <span>{myProgress.cards_studied}/{myProgress.cards_total} cards</span>
                          {myProgress.accuracy > 0 && <span>{Math.round(myProgress.accuracy)}% accuracy</span>}
                          <span>{myProgress.total_reviews} reviews</span>
                        </div>
                      </div>
                    )}

                    {/* Student Progress Table (for teachers/owners) */}
                    {isOwner && assignment.progress?.length > 0 && (
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
                      <span>Completed: {completed}/{totalStudents || students.length}</span>
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
                            <Link href={getMemberProfileUrl(s)} className="t-bar-label" style={{ textDecoration: 'none', color: 'inherit' }}>{s.profiles?.display_name || 'Unknown'}</Link>
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
                        const completedCount = a.progress?.filter(p => p.status === "completed").length || 0;
                        const pct = Math.round((completedCount / total) * 100);
                        const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
                        return (
                          <div className="t-bar-row" key={a.id}>
                            <span className="t-bar-label" title={a.title}>{a.title.length > 20 ? a.title.slice(0, 20) + '…' : a.title}</span>
                            <div className="t-bar-track">
                              <div className="t-bar-fill" style={{ width: `${pct}%`, background: color }}></div>
                            </div>
                            <span className="t-bar-value">{completedCount}/{total}</span>
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
                          <Link key={s.id} href={getMemberProfileUrl(s)} className="t-student-stat-card" style={{ textDecoration: 'none', color: 'inherit', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                            <div className="t-student-stat-header">
                              <div className="t-student-stat-avatar">
                                {s.profiles?.avatar_url
                                  ? <img src={s.profiles.avatar_url} alt="" />
                                  : <span>{(s.profiles?.display_name || '?')[0].toUpperCase()}</span>}
                              </div>
                              <div>
                                <div className="t-student-stat-name">{s.profiles?.display_name || 'Unknown'}</div>
                                <div className="t-student-stat-xp">
                                  <ion-icon name="flash-outline" style={{ fontSize: '12px' }}></ion-icon> {s.profiles?.total_xp || 0} XP · 
                                  <ion-icon name="flame-outline" style={{ fontSize: '12px' }}></ion-icon> {s.profiles?.current_streak || 0}d
                                </div>
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
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
