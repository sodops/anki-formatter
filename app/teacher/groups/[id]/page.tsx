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
  const [activeTab, setActiveTab] = useState<"members" | "assignments">("members");

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
        <Link href="/teacher" style={{ color: "#6366F1" }}>← Back to Dashboard</Link>
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
            <span className="teacher-logo-icon">⚡</span>
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
                    <div key={m.id} className="teacher-member-card">
                      <div className="teacher-member-avatar">
                        {m.profiles?.avatar_url
                          ? <img src={m.profiles.avatar_url} alt="" />
                          : <span>{(m.profiles?.display_name || "?")[0].toUpperCase()}</span>}
                      </div>
                      <div className="teacher-member-info">
                        <span className="teacher-member-name">{m.profiles?.display_name || "Unknown"}</span>
                        <span className="teacher-member-role">Teacher</span>
                      </div>
                    </div>
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
                    <div className="teacher-member-avatar">
                      {m.profiles?.avatar_url
                        ? <img src={m.profiles.avatar_url} alt="" />
                        : <span>{(m.profiles?.display_name || "?")[0].toUpperCase()}</span>}
                    </div>
                    <div className="teacher-member-info">
                      <span className="teacher-member-name">{m.profiles?.display_name || "Unknown"}</span>
                      <div className="teacher-member-stats">
                        <span>⚡ {m.profiles?.total_xp || 0} XP</span>
                        <span>🔥 {m.profiles?.current_streak || 0} day streak</span>
                      </div>
                    </div>
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
              <Link href="/teacher" className="teacher-btn teacher-btn-primary teacher-btn-sm">
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
      </main>
    </div>
  );
}
